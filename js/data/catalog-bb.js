// Conteúdo do plano "Banco do Brasil 2026": é o primeiro plano do sistema e também o modelo usado na migração.
// Extraído sem alterações da versão 1 do sistema (index.html antigo), para preservar ids, datas e temas.
// Os pesos são ESTIMADOS a partir do edital de 2023 e precisam ser confirmados no edital novo.
/* eslint-disable */
var START='2026-11-16';
var DIAS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
var MAT=['Português','Matemática','Mat. Financeira','Informática','Bancários','Atualidades','Vendas','Inglês','Redação','Revisão','Folga'];
var HUE={'Português':350,'Matemática':28,'Mat. Financeira':45,'Informática':200,'Bancários':150,'Atualidades':175,'Vendas':270,'Inglês':320,'Redação':10,'Revisão':230,'Folga':210};
var ST=['A fazer','Em andamento','Feito'];
var DIRECAO='Direção Concursos';

function yt(id){return 'https://www.youtube.com/watch?v='+id;}
function dsec(s){ if(!s) return 0; var p=s.split(':').map(Number), t=0; for(var i=0;i<p.length;i++) t=t*60+(p[i]||0); return t; }

var LIB=[];
function V(id,m,t,c,d,u){ LIB.push({id:id,m:m,t:t,c:c,d:dsec(d),ds:d||'',u:u||yt(id)}); }
// Português
[['q8BvgNRGodU','Aula 1: Interpretação de Textos','34:53'],['YCHLzdFSGmE','Aula 2: Ortografia','34:33'],['kBS1A61wS6w','Aula 3: Ortografia','39:33'],['Q3yVic8nNSU','Aula 4: Ortografia','34:21'],['OaIV3PFt3f4','Aula 5: Ortografia','36:37'],['rLV0QdCBFCM','Aula 6: Ortografia','29:30'],['ZtVOufmFOsA','Aula 7: Ortografia','18:45'],['sK-aa_NAxRY','Aula 8: Ortografia','30:59'],['IL7F_mOt2-w','Aula 9: Classe e Emprego de Palavras','27:57'],['oNk4i5BGJS8','Aula 10: Classe e Emprego de Palavras','44:58'],['BBzDTuTWXYU','Português para o BB (prof. José Maria)','58:55']].forEach(function(a){V(a[0],'Português',a[1],DIRECAO,a[2]);});
// Matemática
[['TUmf17XR218','Aula 1: Números Inteiros, Racionais e Reais','45:03'],['DJ-OVijBIVA','Aula 2: Números Inteiros, Racionais e Reais','25:08'],['FPe5naa2_oc','Aula 3: Números Inteiros, Racionais e Reais','23:27'],['Z8brBAAQ3Z4','Aula 4: Números Inteiros, Racionais e Reais','35:28'],['5Oyk874Xhdg','Aula 5: Números Inteiros, Racionais e Reais','36:42'],['3_auCwvVZM4','Aula 6: Sistemas de Unidades','49:12'],['rg0UDHCQOFc','Aula 7: Sistemas de Unidades','49:12'],['gAzgLzEkUQ0','Aula 8: Sistemas de Medidas','13:28'],['otfZHc6reg0','Aula 9: Divisão proporcional; regra de três simples e compostas','45:40'],['-hf8IAZjYqk','Aula 10: Razões e proporções; regra de três','33:35'],['7yP8Z2HE-fU','Aula 11: Regra de três simples e composta','30:07'],['6S1BoY-yQ54','Aula 12: Regra de três simples e composta','35:32'],['Pgv6ACnRmK4','Mini curso de Matemática Básica (Daniel Lustosa), parte 1','1:04:32'],['EiOY2ci0aEM','Mini curso de Matemática Básica (Daniel Lustosa), parte 2','1:09:48'],['qW8XJoIrfbU','Mini curso de Matemática Básica (Daniel Lustosa), parte 3','58:00'],['4x_724t_swU','Mini curso de Matemática Básica (Daniel Lustosa), parte 4','1:03:52']].forEach(function(a){V(a[0],'Matemática',a[1],DIRECAO,a[2]);});
// Mat. Financeira
V('_XISfE2r3ho','Mat. Financeira','Aula 2: Juros Simples',DIRECAO,'51:29');
V('2f9MtMwPo3k','Mat. Financeira','Aula 02: Juros Simples','Renan Duarte','34:18');
// Informática
[['AeEsINT_VJQ',1,'25:39'],['QVj23_2IqRY',2,'38:00'],['qFM_iqRn7Yo',3,'22:25'],['en0x7Kjqn4A',4,'27:29'],['F3n9HzqIGfs',5,'28:22'],['G4f86RjsBK4',6,'11:56'],['RTp5MaOo4qo',7,'8:34'],['6wWtx7fhLgI',8,'21:41']].forEach(function(a){V(a[0],'Informática','Noções de Sistemas Operacionais, aula '+a[1],DIRECAO,a[2]);});
V('foc-info','Informática','Super-revisão BB: Informática (Érico Araújo, 2023)','Focus Concursos','','https://noticias.focusconcursos.com.br/videos/LyiNRnr5syo');
// Bancários
V('cmBJ9dadVzY','Bancários','Aula 01: Estrutura do Sistema Financeiro Nacional',DIRECAO,'49:27');
V('12L99qposeg','Bancários','Aula 02: Órgãos Normativos (CMN)',DIRECAO,'29:57');
V('d6DPEE-ERGk','Bancários','Aula 03: Órgãos Normativos (CNSP e CNPC)',DIRECAO,'11:28');
V('PiKvuvTbFsI','Bancários','Aula 04: Órgãos Normativos (CRSFN, CRSNSP e CRPC)',DIRECAO,'23:46');
V('E51CKKKQCXE','Bancários','Quiz: 10 questões de Conhecimentos Bancários',DIRECAO,'5:05');
V('QYINo30yDvA','Bancários','Aula 01: Sistema Financeiro Nacional (prof. Renan Duarte)','Renan Duarte','1:07:48');
V('foc-banc','Bancários','Super-revisão BB: Conhecimentos Bancários (Amanda Aires, 2023)','Focus Concursos','','https://noticias.focusconcursos.com.br/videos/crvwFGWiAgU');
// Atualidades
V('aI7bFQ3K8i4','Atualidades','Pix: Atualidades do Mercado Financeiro (BB 2021)','Brayan Souza','14:38');
V('PBGewwG7Vj8','Atualidades','Resumo: Sistema de Pagamentos Instantâneos (Pix)','Fernanda | Concursos Públicos','9:58');
V('C0rNcx_bD4Q','Atualidades','Sistema de pagamentos: Pix e Drex na prova (BB 2026)','Nova Concursos','1:19:13');
// Vendas
V('0vsV-5Ho2To','Vendas','Profissão Escriturário 2023: Vendas e Negociação (Marcelo Soares)',DIRECAO,'1:07:05');
V('VipgaeVqXUQ','Vendas','10 apostas para a prova de Vendas e Negociação (Marcelo Soares)',DIRECAO,'1:04:28');
V('G7FfioStyXs','Vendas','Profissão Escriturário: Vendas e Negociação',DIRECAO,'1:32:55');
V('ZjW4nRImjK0','Vendas','Revisão de reta final: Vendas e Negociação',DIRECAO,'1:36:03');
V('hoE0-F1ylpc','Vendas','Prova BB 2023 resolvida: Vendas e Negociação (Marcelo Soares)',DIRECAO,'2:16:26');
// Revisão
V('0AjDyYNdgiM','Revisão','Como se preparar para a próxima prova (Renan Duarte)',DIRECAO,'1:00:19');

var NEWV=[
'-QVN-QY-64k|Bancários|Aula 02: CMN (BB 2026)|Renan Duarte|47:27',
'lE3813BgqW8|Bancários|Aula 03: BACEN (BB 2026)|Renan Duarte|39:17',
'-Ph8Nl40Jrc|Bancários|Aula 04: Copom (BB 2026)|Renan Duarte|30:29',
'WFh0l76FSbA|Bancários|Aula 05: CVM (BB 2026)|Renan Duarte|25:19',
'yP7uR_TPoqg|Bancários|Aula 06: Outras Instituições Normativas e Supervisoras (BB 2026)|Renan Duarte|19:29',
'kXkUlTZRrMs|Bancários|Aula 07: Conselhos Recursais (BB 2026)|Renan Duarte|16:49',
'uOGAaSZxkmM|Bancários|Aula 08: Instituições Auxiliares (BB 2026)|Renan Duarte|23:38',
'GstsVDC4Svk|Bancários|Aula 09: Operadores Monetários (BB 2026)|Renan Duarte|47:28',
'kyVFwVsiwkI|Bancários|Aula 10: Operadores Não Monetários (BB 2026)|Renan Duarte|1:09:39',
'gLOXuIDKocY|Bancários|Aula 11: Mercado Financeiro e seus Desdobramentos (BB 2026)|Renan Duarte|17:42',
'XHW3Qji-k8Q|Bancários|Aula 12: Políticas Monetárias Convencionais e Não Convencionais (BB 2026)|Renan Duarte|42:10',
'EwrJ0TQ5eRE|Bancários|Aula 13: Selic, Operações Compromissadas e Depósitos Remunerados (BB 2026)|Renan Duarte|23:26',
'v-8EuvmYOJ0|Bancários|Aula 14: Orçamento Público (BB 2026)|Renan Duarte|39:12',
'wakQvmAye5g|Bancários|Aula 15: Títulos do Tesouro Nacional (BB 2026)|Renan Duarte|1:00:33',
'xADMU0zdyWU|Bancários|Aula 16: Dívida Pública (BB 2026)|Renan Duarte|17:44',
'M1IjDnVplA0|Bancários|Aula 17: Cartão de Débito e Cartão de Crédito (BB 2026)|Renan Duarte|58:17',
'Zg-PnxLbAWY|Bancários|Aula 18: Crédito Pessoal e CDC (BB 2026)|Renan Duarte|14:08',
'2tO2D0WWqWw|Bancários|Aula 19: Crédito Rural (BB 2026)|Renan Duarte|23:06',
'k56GpvtXGMk|Bancários|Aula 3: Mercado de Capitais (curso gratuito Gran)|Gran Cursos Online|1:03:55',
'jOxuL7JOMXw|Bancários|Produtos Bancários para o BB|Qconcursos|55:45',
'sQcmcHCLfy4|Bancários|Lavagem de Dinheiro para o BB (aula gratuita)|Qconcursos|47:06',
'c5qWSYVr45I|Bancários|Combate à Lavagem de Dinheiro (resumo)|Passei Concursos|10:45',
'pUQKXbIRp_Y|Bancários|LGPD aplicada ao BB: teoria essencial|Carranza Cursos|46:24',
'p5Zk9y2USIg|Bancários|Código de Ética do Banco do Brasil: teoria e exercícios|Passe Certo Concursos|34:26',
'vHjhEXZoXRA|Bancários|ASG e Sustentabilidade (resumo)|Memória de Aprovado|6:31',
'sEo_ZCBun9c|Bancários|Aula 37: Sistema de Pagamentos Instantâneos (Pix)|Renan Duarte|24:34',
'-a5tmjS3gLY|Bancários|Questões comentadas de Conhecimentos Bancários (1)|Renan Duarte|17:47',
'2nN4x6fJgk4|Bancários|Questões comentadas de Conhecimentos Bancários (2)|Renan Duarte|20:03',
'8tg-o6q3AZw|Bancários|Questões comentadas de Conhecimentos Bancários (3)|Renan Duarte|18:30',
'zOFRZ8573KE|Bancários|Questões comentadas de Conhecimentos Bancários (4)|Renan Duarte|19:28',
'5yZHSSce430|Bancários|Questões comentadas de Conhecimentos Bancários (5)|Renan Duarte|16:28',
'gsQxI2WXkFg|Bancários|Novas questões de Conhecimentos Bancários|Renan Duarte|31:11',
'IkBEqH7XqMw|Atualidades|Aula 01: Os Bancos na Era Digital (BB 2026)|Renan Duarte|53:33',
'91Q649deToQ|Atualidades|Aula 02: Internet Banking e Mobile Banking (BB 2026)|Renan Duarte|10:23',
'DkAh92iOGbc|Atualidades|Aula 03: Open Finance (BB 2026)|Renan Duarte|26:53',
'abQJrWuMAkI|Atualidades|Aula 04: Real Digital (Drex) (BB 2026)|Renan Duarte|33:13',
'Anb1JkK9Z-8|Atualidades|Aula 05: Novos Modelos de Negócios e Marketplace (BB 2026)|Renan Duarte|14:00',
'LvEBgyZUABM|Atualidades|Aula 06: Fintechs (BB 2026)|Renan Duarte|17:39',
'1Q4vVop-e1I|Atualidades|Aula 07: Startups e Big Techs (BB 2026)|Renan Duarte|13:40',
'KU8Sa3sgo-A|Atualidades|Resumão de Atualidades do Mercado Financeiro (BB 2026)|Gran Cursos Online|29:47',
'fBhUiIya_0w|Atualidades|Questões comentadas de Atualidades (1)|Renan Duarte|16:52',
'jGfdCCJb4yI|Atualidades|Questões comentadas de Atualidades (2)|Renan Duarte|13:20',
'vlxfzyUCwco|Vendas|Aula 01: Noções de Estratégia Empresarial (BB 2026)|Renan Duarte|1:04:14',
'yGHOnB9b6zQ|Vendas|Aula 02: Análise de Mercado (BB 2026)|Renan Duarte|29:21',
'FIktnn6HLdU|Vendas|Aula 03: Forças Competitivas (BB 2026)|Renan Duarte|22:42',
'1MCfoEigNbQ|Vendas|Aula 04: Imagem Institucional, Identidade e Posicionamento (BB 2026)|Renan Duarte|16:35',
'tGUfR-VphWo|Vendas|Aula 05: Segmentação de Mercado (BB 2026)|Renan Duarte|37:59',
'IR9l8FdL-bo|Vendas|Aula 06: Ações para Aumentar o Valor Percebido pelo Cliente (BB 2026)|Renan Duarte|22:39',
'ixX9LWuHJpQ|Vendas|Aula 07: Gestão da Experiência do Cliente (BB 2026)|Renan Duarte|20:29',
'_mMltg7VcZw|Vendas|Aula 08: Aprendizagem e Sustentabilidade Organizacional (BB 2026)|Renan Duarte|35:58',
'xKEz5jeUyNE|Vendas|Aula 09: Características dos Serviços (BB 2026)|Renan Duarte|25:58',
'LMVYbymb-eA|Vendas|Aula 10: Gestão da Qualidade em Serviços (BB 2026)|Renan Duarte|24:43',
'UDoBAvk06Gw|Vendas|Aula 11: Técnicas de Vendas, da Pré-Abordagem ao Pós-Vendas|Renan Duarte|19:24',
'58vmK-yKp9o|Vendas|Política de relacionamento com o cliente|TopConcursos|17:57',
'SAxQjVejing|Vendas|Noções de marketing digital|TopConcursos|24:01',
'h_rAxVoCHUw|Vendas|Canais remotos|TopConcursos|13:53',
'iJt4_-LZi9E|Vendas|Código de Defesa do Consumidor para Vendas e Negociação|Qconcursos|1:02:39',
'2AXr4PQdUzE|Vendas|Código de Defesa do Consumidor: artigos 1, 2 e 3 (Marcelo Soares)|Prof. Marcelo Soares|16:07',
'yNPehgeLstU|Vendas|Questões comentadas de Vendas (1)|Renan Duarte|18:38',
'azRs1meVaXI|Vendas|Questões comentadas de Vendas (2)|Renan Duarte|15:38',
'h6sNXez5w_E|Vendas|Questões comentadas de Vendas (3)|Renan Duarte|16:49',
'-WMnSp1K7bI|Informática|Aula 01: Golpes e Malware (Cesgranrio)|Danilo Vilanova|1:09:49',
's6H2GqNaPlw|Informática|Aula 2: Browser e Busca (Cesgranrio)|Danilo Vilanova|50:28',
'biPz_zKF_Ks|Informática|Aula 3: Correio Eletrônico (Cesgranrio)|Danilo Vilanova|1:00:53',
'HawgvoXDm0M|Informática|Aula 4: Segurança da Informação (Cesgranrio)|Danilo Vilanova|1:03:28',
'H194gyDhuB4|Informática|Aula 5: Certificado e Assinatura Digital (Cesgranrio)|Danilo Vilanova|58:29',
'VItmSvRa04k|Informática|Aula 6: Internet e Intranet (Cesgranrio)|Danilo Vilanova|54:41',
'qUQqv_xJvDY|Informática|Aula 7: Sistema Operacional (Cesgranrio)|Danilo Vilanova|1:01:22',
'Wo0DeZijB6E|Informática|Aula 8: Excel (Cesgranrio)|Danilo Vilanova|1:01:27',
'oCicSWrQipc|Informática|Aula 9: Excel, parte 2 (Cesgranrio)|Danilo Vilanova|1:07:29',
'UnAos_ALA5c|Informática|Aula 10: Excel, parte 3 (Cesgranrio)|Danilo Vilanova|1:04:55',
'Hf5QWC7ELSI|Informática|Questões de Word (Cesgranrio)|Danilo Vilanova|1:07:41',
'Ui8M4fh5kKA|Informática|Questões de PowerPoint (Cesgranrio)|Danilo Vilanova|59:14',
'vZrX2JWBY-Y|Informática|Questões de Excel: planilhas (Cesgranrio)|Danilo Vilanova|1:02:53',
'fdPE2uHORYU|Informática|Questões de Malwares (Cesgranrio)|Danilo Vilanova|37:11',
'C0KlVSCf1IQ|Informática|Questões de Sistema Operacional|Danilo Vilanova|1:17:42',
'c8SQkM1d6TQ|Informática|O que mais cai em prova de Informática|Danilo Vilanova|50:21',
'0oEVFtr6KOk|Informática|Simulado de Informática|Danilo Vilanova|48:29',
'G3XnLGf5C2w|Informática|Trilha de estudos: em que ordem estudar Informática|Danilo Vilanova|51:55',
'DqtBTG63mYU|Informática|BB 2023: Word|Lac Concursos|27:46',
'yvcCGm-T4Ak|Informática|Top 10 funções mais importantes do Excel|Excelente João|26:37',
'8O3xBjX8lBU|Informática|Aula 5: Computação em Nuvem|Prof. Marcel Rios|21:59',
'nIP57FKu7TY|Mat. Financeira|Aula 1: Juros Simples|Direção Concursos|23:04',
'ZbqxC_HyELI|Mat. Financeira|Aula 3: Juros Compostos|Direção Concursos|42:40',
'6indBtnLtCw|Mat. Financeira|Aula 4: Juros Compostos|Direção Concursos|26:47',
'bE-CbjJ_GGw|Mat. Financeira|Aula 5: Inflação, Taxa Real e Taxa Aparente|Direção Concursos|21:03',
'4gHk75hypNw|Mat. Financeira|Aula 6: Juros Contínuos|Direção Concursos|18:35',
'VA0Kry-xXkE|Mat. Financeira|Aula 7: Sistemas de Amortização|Direção Concursos|19:23',
'M03xzjlKgP0|Mat. Financeira|Aula 8: Sistemas de Amortização|Direção Concursos|27:46',
'YA_f9noMUS0|Mat. Financeira|Aula 9: Sistemas de Amortização|Direção Concursos|35:31',
's0CLELE2rjM|Mat. Financeira|Aula 10: Sistemas de Amortização|Direção Concursos|14:49',
'rzTmV5xO-Jc|Mat. Financeira|Aula 11: Sistemas de Amortização|Direção Concursos|34:36',
'T3oNmg7n66M|Mat. Financeira|Aula 12: Sistemas de Amortização|Direção Concursos|22:40',
'waCDUKtZ7H0|Mat. Financeira|Aula 13: Sistemas de Amortização|Direção Concursos|47:34',
'81knpGRRzOc|Mat. Financeira|Aula 01: Conceitos Gerais, valor do dinheiro no tempo (Renan Duarte)|Renan Duarte|1:08:20',
'Nax1IlfRj_o|Mat. Financeira|Aula 03: Taxas Proporcionais e Equivalentes em Juros Simples (Renan Duarte)|Renan Duarte|34:22',
'4Ms5jYecNVc|Mat. Financeira|Aula 04: Juros Compostos (Renan Duarte)|Renan Duarte|45:49',
'BK59p41rxCQ|Mat. Financeira|Aula 05: Convenção Linear e Exponencial (Renan Duarte)|Renan Duarte|18:23',
'FZkAkOZ2VGI|Matemática|Conjuntos para concursos: aula 1|Felippe Loureiro|29:05',
'q_xmhahQQCA|Matemática|Lógica proposicional (BB 2024)|Nova Concursos|51:38',
'ylp_EURflx4|Matemática|Sistemas lineares (BB)|Angelo Helio|30:35',
'pyMzs7rEYnw|Matemática|Resumo: matrizes, determinantes e sistemas|Rogério Rodrigues|23:55',
'IzTLejT9u38|Matemática|Porcentagem em questões da Cesgranrio|Felippe Loureiro|29:28',
'ZySrMu-6GHs|Matemática|Porcentagem: Cesgranrio|Felippe Loureiro|24:15',
'AShNijMeZK8|Matemática|Questões comentadas de Matemática (1)|Renan Duarte|20:25',
'-_59GIEx3sw|Matemática|Questões comentadas de Matemática (2)|Renan Duarte|24:28',
'5uMooAjtVis|Português|Crase: as 6 regras mais cobradas|Prof. Álvaro Ferreira|35:59',
'UgLPFnuAHY8|Português|Gabaritando Crase (BB 2026)|Nova Concursos|1:01:35',
'mwesr5YGr9o|Português|Uso da vírgula: regras mais cobradas|Prof. Álvaro Ferreira|40:20',
'2gsi7ng8vLk|Português|Resumo sobre uso da vírgula (BB 2025)|Prof. Álvaro Ferreira|59:59',
'jdqhnVUvqOc|Português|Concordância verbal: teoria e questões|Prof. Álvaro Ferreira|49:36',
'PcXqyBgGjJA|Português|Concordância verbal e nominal|Toda Matéria|12:55',
'1IRO-p95oo0|Português|Regência verbal e nominal: exemplos e questões|Prof. Álvaro Ferreira|43:55',
'kUVN4OCDWnc|Português|30 questões Cesgranrio: Regência|Yara Coeli|1:00:17',
'ZoYcGDtr7Mk|Português|Colocação pronominal: resumo BB 2025|Prof. Álvaro Ferreira|54:45',
'6zsVwix7Uh0|Português|Colocação pronominal para concurso|Prof. Álvaro Ferreira|19:06',
'aibQDQI-Igw|Português|Período composto e conjunções|Gran Cursos Online|1:23:46',
'2JeNi0LlpUU|Português|Período composto: orações coordenadas e subordinadas|Trilhante|6:32',
'am_ee1mXY7k|Inglês|Aula 1: Interpretação de Textos em Inglês|Direção Concursos|42:49',
'T6Jiwgfm_Vg|Inglês|Aula 2: Interpretação de Textos em Inglês|Direção Concursos|19:42',
'-CSByuSIp94|Inglês|Aula 3: Pronomes em Inglês|Direção Concursos|32:47',
'etxFXj9xaUQ|Inglês|Aula 4: Pronomes em Inglês|Direção Concursos|33:14',
'3pP_36Yvt9Y|Inglês|Aula 5: Pronomes em Inglês|Direção Concursos|33:40',
'qQTwJfzoLEs|Inglês|Aula 6: Artigos em Inglês|Direção Concursos|35:50',
'Ef6tAGgVyKQ|Inglês|Aula 7: Artigos em Inglês|Direção Concursos|31:22',
'9gW70aNR8oI|Inglês|Aula 8: Conectivos do Inglês|Direção Concursos|24:47',
'tcOiiQl-W8U|Inglês|Aula 9: Conjunções Subordinativas em Inglês|Direção Concursos|37:53',
'iLSSGGnz_c8|Inglês|Aula 10: Advérbios em Inglês|Direção Concursos|34:50',
'HFQ2oGp6uXg|Inglês|Aula 11: Advérbios em Inglês|Direção Concursos|23:19',
'gUxMy3RyyR4|Inglês|Aula 12: Advérbios em Inglês|Direção Concursos|35:07',
'gkokJEryZ4g|Inglês|Aula 13: Advérbios em Inglês|Direção Concursos|43:08',
'-V41XKu-8F8|Inglês|Inglês para o BB: dicas Cesgranrio|Teacher Andrea Belo|1:07:27',
'YaMTGqtWGx8|Inglês|Bateria de questões Cesgranrio do Banco do Brasil|Teacher Andrea Belo|1:36:11',
'w0CoaWJWb2k|Revisão|Simulado BB 2026 (v1)|Renan Duarte|1:18:44',
'EkneN1-Meuc|Revisão|Simulado BB 2026 (v2)|Renan Duarte|1:11:14',
'Gemuc6XVQ2w|Revisão|Simulado BB 2026 (v3)|Renan Duarte|1:08:29',
'tIeKGuzYWPs|Revisão|Simulado BB 2026 (v4)|Renan Duarte|1:27:35',
'Sd6Vkw30mkM|Revisão|Simulado BB 2026 (v5)|Renan Duarte|1:37:29'
];
NEWV.forEach(function(x){var p=x.split('|');if(!LIB.some(function(v){return v.id===p[0];}))V(p[0],p[1],p[2],p[3],p[4]);});

var PLAYLISTS=[
 ['Português','Curso gratuito de Português (Direção)','https://www.youtube.com/playlist?list=PLf8SnkouFmb3GbulLruG0KRUsiuqIfDqu'],
 ['Matemática','Curso gratuito de Matemática (Direção)','https://www.youtube.com/playlist?list=PLf8SnkouFmb2EHdcM40JYqBYjN6TkpgCj'],
 ['Mat. Financeira','Curso gratuito de Matemática Financeira (Direção)','https://www.youtube.com/playlist?list=PLf8SnkouFmb0eqPhnmCNaeiQGve9OFegI'],
 ['Mat. Financeira','Matemática Financeira (Renan Duarte)','https://www.youtube.com/playlist?list=PLSkeYJRHX0Yl2ZWlnNcEwss7HnSlDFHdv'],
 ['Informática','Curso gratuito de Informática (Direção)','https://www.youtube.com/playlist?list=PLf8SnkouFmb3A4NKeBFsNnvykS1b7dHRF'],
 ['Bancários','Curso gratuito de Conhecimentos Bancários (Direção)','https://www.youtube.com/playlist?list=PLf8SnkouFmb2rBvWePQncnqwqi20UjoQ5'],
 ['Bancários','Conhecimentos Bancários completo (Renan Duarte)','https://www.youtube.com/playlist?list=PLSkeYJRHX0YnON8kfiAwowkISGltf4KE2'],
 ['Vendas','Vendas e Negociação, curso completo (Renan Duarte)','https://www.youtube.com/playlist?list=PLSkeYJRHX0YkVCNPmiURzoxM3P8ZiHINi'],
 ['Atualidades','Atualidades do Mercado Financeiro (Renan Duarte)','https://www.youtube.com/playlist?list=PLSkeYJRHX0YnWnP4Bi99LEUAnLg4lWxpD'],
 ['Informática','Informática Cesgranrio (Danilo Vilanova)','https://www.youtube.com/playlist?list=PLnmFkFtxOflKkpr_H9XtHK3vrQG7yi7I4'],
 ['Revisão','Questões comentadas BB 2026 (Renan Duarte)','https://www.youtube.com/playlist?list=PLSkeYJRHX0YmKVi59AMzqJ8TsiZ96KxLq'],
 ['Inglês','Inglês e outras matérias, BB 2024/2025 (Direção)','https://www.youtube.com/playlist?list=PLf8SnkouFmb3_xHPbXqRBpARdNU3A5YDa']
];

/* cronograma: 13 semanas x 6 dias [matéria, tema] */
var W=[
[['Português','Interpretação de texto e classes de palavras'],['Matemática','Razões, proporções e medidas'],['Informática','Windows, arquivos e atalhos'],['Bancários','Órgãos normativos (CMN) e Pix'],['Vendas','Atendimento e tipos de cliente'],['Revisão','Diagnóstico: 1 prova antiga completa (pode dividir em 2 dias)']],
[['Português','Crase'],['Matemática','Regra de três, proporção e divisão proporcional'],['Informática','Word'],['Bancários','Política monetária e Selic; open banking'],['Vendas','Ciclo da venda: pré, durante e pós'],['Revisão','Revisão + 40 questões mistas']],
[['Português','Pontuação'],['Mat. Financeira','Juros simples'],['Informática','Excel: fórmulas básicas'],['Bancários','Mercados de crédito, capitais e câmbio; fintechs'],['Vendas','Segmentação e valor do cliente'],['Revisão','Revisão + questões de Informática e Vendas']],
[['Português','Concordância verbal e nominal'],['Matemática','Conjuntos e lógica proposicional'],['Informática','Segurança da informação'],['Bancários','Cartões, crédito e poupança; big techs'],['Vendas','Qualidade no atendimento'],['Revisão','Mini simulado de 30 questões + balanço do mês']],
[['Português','Regência verbal e nominal'],['Mat. Financeira','Juros compostos'],['Informática','Excel: SE, PROCV, gráficos'],['Bancários','Lavagem de dinheiro (Lei 9.613) e sigilo bancário'],['Vendas','Técnicas de venda e objeções'],['Redação','Revisão + 1ª redação (30 linhas) + 30 questões de Mat. Financeira']],
[['Português','Colocação pronominal'],['Mat. Financeira','Taxas equivalentes e nominais'],['Informática','PowerPoint e Teams'],['Bancários','LGPD e ética; criptoativos e blockchain'],['Vendas','Canais remotos e marketing digital'],['Revisão','Revisão de 1h30 (semana leve)']],
[['Português','Interpretação: textos de 2 a 3 parágrafos'],['Mat. Financeira','Sistemas de amortização: SAC e Price'],['Informática','Redes, e-mail e navegadores'],['Bancários','Seguros, investimentos e títulos públicos'],['Vendas','Código de Defesa do Consumidor'],['Revisão','Revisão de 1h30 (semana leve)']],
[['Português','Sintaxe do período'],['Matemática','Funções, matrizes e sistemas (rápido)'],['Informática','Linux básico e nuvem'],['Bancários','ESG, autorregulação e câmbio'],['Vendas','Lei 13.146/2015 e normas de ouvidoria'],['Redação','Prova antiga completa (5 h) + redação + Inglês + balanço']],
[['Português','40 questões do tema que mais errou'],['Mat. Financeira','30 questões (juros, SAC, Price)'],['Informática','Excel e Word: 40 questões'],['Bancários','SFN e mercados: 30 questões'],['Vendas','40 questões'],['Revisão','Simulado 1 (70 questões) + redação']],
[['Português','3 textos longos de interpretação'],['Matemática','Porcentagem, proporção e lógica: 30 questões'],['Informática','Segurança, redes e nuvem: 40 questões'],['Bancários','Produtos e leis (9.613, LGPD, ESG): 30 questões'],['Vendas','CDC e normas de ouvidoria: 30 questões'],['Revisão','Simulado 2 + revisão dos erros']],
[['Português','Crase, pontuação e regência: 40 questões'],['Mat. Financeira','Mat. Financeira e Matemática misturadas'],['Informática','Windows, Linux e Teams: 40 questões'],['Atualidades','Pix e open banking: 20 questões'],['Vendas','Técnicas de venda e atendimento: 40 questões'],['Redação','Simulado 3 + redação']],
[['Português','Resumo de 1 página + 30 questões'],['Mat. Financeira','Fórmulas em flashcards + 20 questões'],['Informática','Prova só de Informática: 30 questões cronometradas'],['Bancários','Revisão de siglas e leis em flashcards'],['Vendas','Prova só de Vendas: 30 questões cronometradas'],['Revisão','Simulado 4 (o último, cronometrado) + balanço final']],
[['Português','Revisão leve, 40 min'],['Folga','Folga (Carnaval)'],['Informática','Revisão leve, 40 min'],['Folga','Folga'],['Folga','Folga'],['Revisão','Caderno de erros (1h30) e planejamento dos próximos meses']]
];
var VBYDATE={
 '2026-11-14':['cmBJ9dadVzY'],
 '2026-11-16':['q8BvgNRGodU','IL7F_mOt2-w'],
 '2026-11-17':['-hf8IAZjYqk','gAzgLzEkUQ0'],
 '2026-11-18':['AeEsINT_VJQ','QVj23_2IqRY'],
 '2026-11-19':['12L99qposeg','d6DPEE-ERGk','aI7bFQ3K8i4','E51CKKKQCXE'],
 '2026-11-20':['0vsV-5Ho2To'],
 '2026-11-24':['otfZHc6reg0','7yP8Z2HE-fU','6S1BoY-yQ54'],
 '2026-12-01':['_XISfE2r3ho'],
 '2027-01-28':['C0rNcx_bD4Q'],
 '2027-02-03':['foc-info'],
 '2027-02-04':['foc-banc']
};

/* ampliação do plano (v2): vídeos extras por data, ajustes de tema e Inglês nos sábados */
var VB2={
 '2026-11-23':['5uMooAjtVis','oNk4i5BGJS8'],
 '2026-11-25':['Hf5QWC7ELSI','qFM_iqRn7Yo'],
 '2026-11-26':['lE3813BgqW8','-Ph8Nl40Jrc','EwrJ0TQ5eRE'],
 '2026-11-27':['UDoBAvk06Gw','vlxfzyUCwco'],
 '2026-11-28':['am_ee1mXY7k'],
 '2026-11-30':['mwesr5YGr9o','2gsi7ng8vLk'],
 '2026-12-01':['nIP57FKu7TY'],
 '2026-12-02':['Wo0DeZijB6E','en0x7Kjqn4A'],
 '2026-12-03':['k56GpvtXGMk','WFh0l76FSbA','gLOXuIDKocY'],
 '2026-12-04':['yGHOnB9b6zQ','tGUfR-VphWo','IR9l8FdL-bo'],
 '2026-12-05':['T6Jiwgfm_Vg','-CSByuSIp94'],
 '2026-12-07':['jdqhnVUvqOc','PcXqyBgGjJA'],
 '2026-12-08':['FZkAkOZ2VGI','q_xmhahQQCA'],
 '2026-12-09':['HawgvoXDm0M','fdPE2uHORYU'],
 '2026-12-10':['M1IjDnVplA0','Zg-PnxLbAWY','2tO2D0WWqWw'],
 '2026-12-11':['ixX9LWuHJpQ','xKEz5jeUyNE','LMVYbymb-eA'],
 '2026-12-12':['etxFXj9xaUQ','3pP_36Yvt9Y'],
 '2026-12-14':['1IRO-p95oo0','kUVN4OCDWnc'],
 '2026-12-15':['ZbqxC_HyELI','6indBtnLtCw'],
 '2026-12-16':['oCicSWrQipc','F3n9HzqIGfs'],
 '2026-12-17':['sQcmcHCLfy4','c5qWSYVr45I'],
 '2026-12-18':['FIktnn6HLdU','1MCfoEigNbQ','_mMltg7VcZw'],
 '2026-12-19':['qQTwJfzoLEs','Ef6tAGgVyKQ'],
 '2026-12-21':['ZoYcGDtr7Mk','6zsVwix7Uh0'],
 '2026-12-22':['bE-CbjJ_GGw','Nax1IlfRj_o','4gHk75hypNw'],
 '2026-12-23':['Ui8M4fh5kKA','G4f86RjsBK4','RTp5MaOo4qo','6wWtx7fhLgI'],
 '2026-12-24':['pUQKXbIRp_Y','p5Zk9y2USIg'],
 '2026-12-25':['58vmK-yKp9o','SAxQjVejing','h_rAxVoCHUw'],
 '2026-12-26':['9gW70aNR8oI','tcOiiQl-W8U'],
 '2026-12-28':['BBzDTuTWXYU'],
 '2026-12-29':['VA0Kry-xXkE','M03xzjlKgP0','YA_f9noMUS0'],
 '2026-12-30':['s6H2GqNaPlw','VItmSvRa04k'],
 '2026-12-31':['wakQvmAye5g','xADMU0zdyWU'],
 '2027-01-01':['2AXr4PQdUzE','iJt4_-LZi9E'],
 '2027-01-02':['iLSSGGnz_c8','HFQ2oGp6uXg'],
 '2027-01-04':['aibQDQI-Igw','2JeNi0LlpUU'],
 '2027-01-05':['ylp_EURflx4','pyMzs7rEYnw'],
 '2027-01-06':['qUQqv_xJvDY','8O3xBjX8lBU'],
 '2027-01-07':['vHjhEXZoXRA','GstsVDC4Svk','XHW3Qji-k8Q'],
 '2027-01-09':['gUxMy3RyyR4'],
 '2027-01-12':['s0CLELE2rjM','rzTmV5xO-Jc','T3oNmg7n66M'],
 '2027-01-13':['c8SQkM1d6TQ'],
 '2027-01-14':['-a5tmjS3gLY','2nN4x6fJgk4','8tg-o6q3AZw'],
 '2027-01-15':['yNPehgeLstU','azRs1meVaXI','h6sNXez5w_E'],
 '2027-01-16':['w0CoaWJWb2k'],
 '2027-01-19':['IzTLejT9u38','ZySrMu-6GHs'],
 '2027-01-20':['0oEVFtr6KOk','H194gyDhuB4'],
 '2027-01-21':['zOFRZ8573KE','5yZHSSce430','gsQxI2WXkFg'],
 '2027-01-23':['EkneN1-Meuc'],
 '2027-01-26':['waCDUKtZ7H0'],
 '2027-01-27':['C0KlVSCf1IQ'],
 '2027-01-28':['DkAh92iOGbc','abQJrWuMAkI'],
 '2027-01-30':['Gemuc6XVQ2w'],
 '2027-02-06':['tIeKGuzYWPs']
};
/* v3: os vídeos que tinham ficado só na biblioteca agora também têm dia */
var VB3={
 '2026-11-17':['TUmf17XR218','DJ-OVijBIVA','FPe5naa2_oc'],
 '2026-11-18':['G3XnLGf5C2w'],
 '2026-11-19':['QYINo30yDvA'],
 '2026-11-20':['0AjDyYNdgiM'],
 '2026-11-23':['UgLPFnuAHY8'],
 '2026-11-24':['Z8brBAAQ3Z4'],
 '2026-11-25':['DqtBTG63mYU'],
 '2026-11-26':['-QVN-QY-64k'],
 '2026-11-28':['81knpGRRzOc'],
 '2026-11-30':['YCHLzdFSGmE'],
 '2026-12-01':['2f9MtMwPo3k','5Oyk874Xhdg'],
 '2026-12-02':['yvcCGm-T4Ak'],
 '2026-12-03':['PiKvuvTbFsI','yP7uR_TPoqg'],
 '2026-12-05':['-WMnSp1K7bI'],
 '2026-12-07':['kBS1A61wS6w','Q3yVic8nNSU'],
 '2026-12-08':['3_auCwvVZM4'],
 '2026-12-10':['kXkUlTZRrMs','uOGAaSZxkmM','Anb1JkK9Z-8'],
 '2026-12-14':['OaIV3PFt3f4'],
 '2026-12-15':['4Ms5jYecNVc'],
 '2026-12-17':['jOxuL7JOMXw','sEo_ZCBun9c','PBGewwG7Vj8'],
 '2026-12-21':['rLV0QdCBFCM','ZtVOufmFOsA'],
 '2026-12-22':['BK59p41rxCQ','rg0UDHCQOFc'],
 '2026-12-24':['IkBEqH7XqMw','91Q649deToQ'],
 '2026-12-28':['sK-aa_NAxRY'],
 '2026-12-29':['Pgv6ACnRmK4'],
 '2026-12-31':['v-8EuvmYOJ0','LvEBgyZUABM','1Q4vVop-e1I'],
 '2027-01-02':['gkokJEryZ4g'],
 '2027-01-05':['EiOY2ci0aEM'],
 '2027-01-06':['biPz_zKF_Ks'],
 '2027-01-08':['G7FfioStyXs'],
 '2027-01-13':['UnAos_ALA5c'],
 '2027-01-14':['KU8Sa3sgo-A','fBhUiIya_0w'],
 '2027-01-18':['-V41XKu-8F8'],
 '2027-01-19':['qW8XJoIrfbU'],
 '2027-01-21':['jGfdCCJb4yI'],
 '2027-01-22':['VipgaeVqXUQ'],
 '2027-01-25':['YaMTGqtWGx8'],
 '2027-01-26':['AShNijMeZK8','-_59GIEx3sw'],
 '2027-01-29':['ZjW4nRImjK0'],
 '2027-02-02':['4x_724t_swU'],
 '2027-02-03':['vZrX2JWBY-Y'],
 '2027-02-04':['kyVFwVsiwkI'],
 '2027-02-05':['hoE0-F1ylpc'],
 '2027-02-13':['Sd6Vkw30mkM']
};
var TEMA2={
 '2026-11-26':['Política monetária e Selic; open banking','BACEN, Copom e Selic'],
 '2026-12-18':['Técnicas de venda e objeções','Estratégia: forças competitivas, posicionamento e aprendizagem'],
 '2026-12-24':['LGPD e ética; criptoativos e blockchain','LGPD e ética (Código de Ética do BB)'],
 '2026-12-31':['Seguros, investimentos e títulos públicos','Títulos públicos e dívida pública'],
 '2027-01-07':['ESG, autorregulação e câmbio','ESG, operadores monetários e políticas monetárias']
};
var ING=['2026-11-28', '2026-12-05', '2026-12-12', '2026-12-19', '2026-12-26', '2027-01-02', '2027-01-18', '2027-01-25'];
function defTema(date){var n=Math.round((new Date(date+'T12:00:00Z')-new Date(START+'T12:00:00Z'))/86400000);if(n<0)return null;var w=Math.floor(n/7),d=n%7;return (W[w]&&W[w][d])?W[w][d][1]:null;}
function newTema(date,base){if(TEMA2[date]&&TEMA2[date][0]===base)return TEMA2[date][1];if(ING.indexOf(date)>=0&&base.indexOf('Inglês')<0)return base+' + Inglês';return base;}
var PESO={'Informática':22.5,'Vendas':22.5,'Bancários':15,'Português':15,'Matemática':7.5,'Mat. Financeira':7.5,'Atualidades':5,'Inglês':5};

export const BB_PLAN_ID = 'bb2026';
export const BB_TEMPLATE = {
  planId: BB_PLAN_ID,
  name: 'Banco do Brasil 2026',
  goal: 'Escriturário (Agente Comercial) · Maceió/AL',
  banca: 'Cesgranrio',
  start: START,
  earlyDay: { date: '2026-11-14', subject: 'Bancários', title: 'Sistema Financeiro Nacional (começo antecipado)' },
  subjects: MAT.map((m, i) => ({ name: m, hue: HUE[m], weight: PESO[m] == null ? null : PESO[m], order: i, kind: (m === 'Folga' ? 'rest' : (m === 'Revisão' || m === 'Redação') ? 'activity' : 'subject') })),
  weightsSource: { label: 'Edital de 2023 (aproximado)', status: 'estimado', note: 'Pesos estimados a partir do último edital. Confirme quando o edital novo sair.' },
  weeks: W,
  lightWeeks: [6, 7, 13],
  videosByDate(date) { return (VB2[date] || []).concat(VBYDATE[date] || []).concat(VB3[date] || []); },
  topicFor(date, base) { return newTema(date, base); },
  defaultTopic: defTema,
  legacyMigrations: { VB2, VB3 },
  videos: LIB.map(v => ({ yt: /^[A-Za-z0-9_-]{11}$/.test(v.id) ? v.id : null, legacyId: v.id, subject: v.m, title: v.t, channel: v.c, durationSec: v.d, durationText: v.ds, url: v.u })),
  playlists: PLAYLISTS.map(p => ({ subject: p[0], title: p[1], url: p[2] })),
};
