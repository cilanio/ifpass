"""Testa Auth e PostgREST no conjunto Docker descartável da etapa 7.3."""
import json
import re
import secrets
import subprocess
from concurrent.futures import ThreadPoolExecutor

def http(port, path, token=None, payload=None, expected=200):
    args = ['docker','exec','ifpass73-api-db','wget','-Y','off','-T','10','-S','-O','-']
    if token:
        args += ['--header','Authorization: Bearer '+token]
    if payload is not None:
        args += ['--header','Content-Type: application/json','--header','Prefer: return=representation','--post-data',json.dumps(payload)]
    p = subprocess.run(args+[f'http://127.0.0.1:{port}{path}'],capture_output=True,text=True)
    status = re.search(r'HTTP/1\.[01] (\d+)',p.stderr)
    assert status and int(status[1]) in ([expected] if isinstance(expected,int) else expected), (path,p.stderr[:500],p.stdout[:300])
    return json.loads(p.stdout) if p.stdout else None

def rest(path, token=None, payload=None, expected=200):
    return http(3000,path,token,payload,expected)

def rpc(name,payload,token=None,expected=200):
    return rest('/rpc/ifpass_'+name,token,payload,expected)

def sql(query):
    p=subprocess.run(['docker','exec','-i','ifpass73-api-db','psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True,check=True)
    return p.stdout.strip()

def check(cond, name):
    assert cond,name
    print('OK:',name,flush=True)

def conta(nome):
    email=nome+'-'+secrets.token_hex(4)+'@example.org'
    senha=secrets.token_urlsafe(24)
    http(9999,'/signup',payload={'email':email,'password':senha,'data':{'nome':nome}},expected=(200,201))
    v=http(9999,'/token?grant_type=password',payload={'email':email,'password':senha})
    assert re.fullmatch(r'[0-9a-f-]{36}',v['user']['id'])
    return v['user']['id'],v['access_token']


aluno, jwt = conta('aluno')
outro, jwt_outro = conta('outro')
revisor, jwt_revisor = conta('revisor')
check(rest('/profiles?select=id', jwt) == [{'id': aluno}], 'Auth cria perfil e PostgREST aplica o JWT')
rpc('treino_retomar', {}, expected=(401, 403, 404))
check(True, 'RPC não é executável por anônimo')

q = '00000000-0000-4000-8000-000000000173'
sql(f"""
INSERT INTO public.papeis_equipe(usuario_id,papel,alterado_por)
VALUES ('{revisor}','revisor_pedagogico','{outro}');
INSERT INTO public.revisor_disciplinas(usuario_id,disciplina,alterado_por)
VALUES ('{revisor}','Língua Portuguesa','{outro}');
INSERT INTO public.questoes_ia
(id,disciplina,assunto_id,etapa,habilidade_principal,dificuldade,enunciado,alternativas,
 resposta_correta,explicacao,status,submetida_por,finalidade)
VALUES ('{q}','Língua Portuguesa','p_texto','fundamentos','compreensao','facil','Questão fictícia',
 '{{"A":"Um","B":"Dois","C":"Três","D":"Quatro","E":"Cinco"}}','A',
 '{{"correta":"Explicação fictícia","distratores":{{"B":"B","C":"C","D":"D","E":"E"}}}}',
 'em_revisao','{outro}','aprendizagem');
UPDATE public.treino_configuracao_autoral SET habilitado = true, minimo = 1 WHERE etapa = 'fundamentos';
""")

checklist = dict.fromkeys((
    'gabarito_incorreto alternativa_correta_nao_unica erro_conceitual_ou_matematico '
    'ambiguidade informacoes_insuficientes fora_do_edital_sem_justificativa '
    'explicacao_incompativel reproducao_indevida'
).split(), False)
checklist.update(dict.fromkeys((
    'fidelidade_edital correcao_cientifica_matematica_linguistica clareza_precisao '
    'qualidade_alternativas adequacao_dificuldade compatibilidade_copeve qualidade_explicacao'
).split(), True))

args = {'p_assunto': 'p_texto', 'p_etapa': 'fundamentos'}
check(rpc('treino_iniciar', args, jwt) == {'status': 'questoes_insuficientes', 'disponiveis': 0, 'minimo': 1}, 'Questão em revisão é inelegível')
rpc('revisar_questao', {
    'p_id': q, 'p_versao': 1, 'p_decisao': 'aprovada', 'p_checklist_versao': 1,
    'p_criterios': checklist,
}, jwt_revisor)

def em_paralelo(nome, payload):
    with ThreadPoolExecutor(max_workers=2) as executor:
        return list(executor.map(lambda _: rpc(nome, payload, jwt), range(2)))

inicio, reenvio = em_paralelo('treino_iniciar', args)
sessao = inicio['sessao']['id']
item = inicio['itens'][0]['item_id']
check(inicio == reenvio and len(inicio['itens']) == 1
      and sql(f"SELECT count(*) FROM public.treino_sessoes WHERE user_id = '{aluno}' AND autoral") == '1',
      'Inícios concorrentes recuperam a mesma sessão')
check('gabarito' not in json.dumps(inicio), 'Composição inicial omite o gabarito')
check(rpc('treino_retomar', {'p_sessao': sessao}, jwt_outro) is None
      and rest('/treino_sessoes?select=id', jwt_outro) == [], 'RLS e RPC isolam a sessão do segundo aluno')
rpc('treino_retomar', {'p_sessao': sessao}, jwt_revisor, 403)
check(rest('/treino_respostas?select=id', jwt_revisor) == [], 'Revisor não lê sessões ou respostas de alunos')

resposta, repetida = em_paralelo('responder_autoral', {'p_item': item, 'p_alternativa': 'A'})
check(resposta == repetida and resposta['gabarito'] == 'A'
      and sql(f"SELECT count(*) FROM public.treino_respostas WHERE item_id = '{item}'") == '1',
      'Respostas concorrentes registram uma tentativa antes do feedback')
check(rpc('treino_retomar', {}, jwt)['itens'][0]['resposta']['alternativa'] == 'A',
      'Retomada recupera a resposta da versão atribuída')

final, final_repetido = em_paralelo('treino_finalizar', {'p_sessao': sessao})
check(final == final_repetido and final['sessao']['status'] == 'finalizada'
      and final['sessao']['acertos'] == 1 and final['sessao']['total_questoes'] == 1,
      'Finalizações concorrentes devolvem o mesmo resultado canônico')
