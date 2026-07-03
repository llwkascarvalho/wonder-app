from sqlalchemy import create_engine
from src.main.core.config import settings

# Um engine por banco — o admin não possui banco próprio, apenas lê
# a tabela logs_auditoria já existente em cada um dos quatro bancos.
engines = {
    nome: create_engine(url, pool_pre_ping=True)
    for nome, url in settings.database_urls.items()
}
