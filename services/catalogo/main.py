import os
import psycopg2
from fastapi import FastAPI, HTTPException, Request
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Wonder - Serviço Catálogo",
    description="Responsável pelo gerenciamento de prestadores e serviços.",
    version="1.0.0"
)


# BANCO DE DADOS 

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("CATALOGO_DB_HOST"),
        port=os.getenv("CATALOGO_DB_PORT"),
        dbname=os.getenv("CATALOGO_DB_NAME"),
        user=os.getenv("CATALOGO_DB_USER"),
        password=os.getenv("CATALOGO_DB_PASSWORD")
    )

@app.on_event("startup")
def verificar_conexao_banco():
    try:
        conn = get_db_connection()
        conn.close()
        print("✅ Conexão com db_catalogo estabelecida com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao conectar com db_catalogo: {e}")


# AUDITORIA DE LEITURA (application-based) 

def registrar_auditoria_leitura(usuario_id: str, tabela: str, descricao: str):
    """
    Registra manualmente um SELECT na tabela logs_auditoria.

    Os triggers do PostgreSQL cobrem INSERT, UPDATE e DELETE
    automaticamente. Para operações de leitura feitas por administradores,
    o próprio código FastAPI executa este INSERT, conforme critério da Issue 8.
    """
    try:
        conn = get_db_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO logs_auditoria
                        (usuario_id, operacao, tabela_afetada, dados_novos)
                    VALUES (%s, 'SELECT', %s, %s::jsonb)
                """, (
                    usuario_id,
                    tabela,
                    f'{{"descricao": "{descricao}"}}'
                ))
        conn.close()
    except Exception as e:
        # Auditoria nunca deve derrubar a requisição principal
        print(f"⚠️  Falha ao registrar auditoria: {e}")


def get_user_id(request: Request) -> str:
    """Extrai o X-User-ID injetado pelo Gateway após validar o JWT."""
    return request.headers.get("X-User-ID", "desconhecido")


def is_admin(request: Request) -> bool:
    """
    Verifica se o usuário é administrador pelo header X-User-Role,
    injetado pelo Gateway a partir do campo tipo_usuario do JWT.
    """
    return request.headers.get("X-User-Role", "").lower() == "admin"


# HEALTH 

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "catalogo"}


# ENDPOINTS DE CATÁLOGO (Issue 8)

@app.get("/catalogo/prestadores", tags=["Catálogo"])
def listar_prestadores(request: Request):
    """
    Lista todos os prestadores ativos.
    Se a requisição vier de um administrador, registra auditoria de leitura.
    Requer JWT válido (validado pelo Gateway antes de chegar aqui).
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.id, p.nome_estab, p.documento, p.status,
                       u.email, u.foto_perfil, u.endereco
                FROM   prestador p
                JOIN   customuser u ON u.id = p.usuario_id
                WHERE  p.status = 'ativo'
                ORDER  BY p.nome_estab
            """)
            colunas = [desc[0] for desc in cur.description]
            prestadores = [dict(zip(colunas, row)) for row in cur.fetchall()]
    finally:
        conn.close()

    if is_admin(request):
        registrar_auditoria_leitura(
            usuario_id=get_user_id(request),
            tabela="prestador",
            descricao=f"Admin listou {len(prestadores)} prestadores"
        )

    return prestadores


@app.get("/catalogo/prestadores/{prestador_id}", tags=["Catálogo"])
def obter_prestador(prestador_id: int, request: Request):
    """
    Retorna os dados de um prestador específico pelo ID.
    Se a requisição vier de um administrador, registra auditoria de leitura.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.id, p.nome_estab, p.documento, p.status,
                       u.email, u.foto_perfil, u.endereco
                FROM   prestador p
                JOIN   customuser u ON u.id = p.usuario_id
                WHERE  p.id = %s
            """, (prestador_id,))
            colunas = [desc[0] for desc in cur.description]
            row = cur.fetchone()
    finally:
        conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail="Prestador não encontrado.")

    prestador = dict(zip(colunas, row))

    if is_admin(request):
        registrar_auditoria_leitura(
            usuario_id=get_user_id(request),
            tabela="prestador",
            descricao=f"Admin consultou prestador id={prestador_id}"
        )

    return prestador


@app.get("/catalogo/prestadores/{prestador_id}/servicos", tags=["Catálogo"])
def listar_servicos_prestador(prestador_id: int, request: Request):
    """
    Retorna todos os serviços oferecidos por um prestador.
    Se a requisição vier de um administrador, registra auditoria de leitura.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verificar se o prestador existe
            cur.execute("SELECT id FROM prestador WHERE id = %s", (prestador_id,))
            if cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Prestador não encontrado.")

            cur.execute("""
                SELECT s.id, s.nome, s.preco, s.duracao_min,
                       c.nome AS categoria
                FROM   servico s
                LEFT   JOIN categoria c ON c.id = s.categoria_id
                WHERE  s.prestador_id = %s
                ORDER  BY s.nome
            """, (prestador_id,))
            colunas = [desc[0] for desc in cur.description]
            servicos = [dict(zip(colunas, row)) for row in cur.fetchall()]
    finally:
        conn.close()

    if is_admin(request):
        registrar_auditoria_leitura(
            usuario_id=get_user_id(request),
            tabela="servico",
            descricao=f"Admin listou {len(servicos)} servicos do prestador id={prestador_id}"
        )

    return servicos
