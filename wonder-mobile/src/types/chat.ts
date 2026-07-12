export type ChatAutor = 'usuario' | 'assistente';

export type ChatMensagem = {
  id: string;
  autor: ChatAutor;
  texto: string;
};
