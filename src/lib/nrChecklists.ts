export type ChecklistPergunta = {
  grupo: string;
  pergunta: string;
  referencia?: string;
};

export type NrChecklist = {
  codigo: string;
  titulo: string;
  descricao: string;
  perguntas: ChecklistPergunta[];
};

const q = (grupo: string, itens: Array<[string, string?]>): ChecklistPergunta[] =>
  itens.map(([pergunta, referencia]) => ({ grupo, pergunta, referencia }));

export const NR_CHECKLISTS: NrChecklist[] = [
  {
    codigo: "NR-01",
    titulo: "Disposições Gerais e Gerenciamento de Riscos Ocupacionais",
    descricao:
      "Verificação do PGR, inventário de riscos, plano de ação, ordens de serviço e treinamentos.",
    perguntas: [
      ...q("Programa de Gerenciamento de Riscos", [
        [
          "A empresa possui PGR (ou declaração de dispensa para MEI/ME/EPP grau 1 e 2) elaborado e vigente?",
          "1.5.3.1",
        ],
        ["O PGR contempla o Inventário de Riscos Ocupacionais atualizado?", "1.5.7.3"],
        [
          "O PGR contempla o Plano de Ação com medidas de prevenção, prazos e responsáveis?",
          "1.5.5.2",
        ],
        [
          "O inventário de riscos foi revisado nos últimos 2 anos (ou 3 anos com SGSST certificado)?",
          "1.5.7.3.2",
        ],
        [
          "Há evidência de acompanhamento da eficácia das medidas de prevenção implantadas?",
          "1.5.5.3",
        ],
        [
          "Os riscos foram identificados por função/GES com avaliação de severidade e probabilidade?",
          "1.5.4.4",
        ],
        [
          "Há registro de levantamento preliminar de perigos antes do início de novas atividades?",
          "1.5.4.3",
        ],
      ]),
      ...q("Ordens de Serviço e Informação", [
        [
          "Os trabalhadores recebem Ordem de Serviço sobre segurança e saúde no trabalho?",
          "1.4.1 'b'",
        ],
        ["As Ordens de Serviço estão assinadas pelos trabalhadores e arquivadas?", "1.4.1 'b'"],
        [
          "Os trabalhadores são informados sobre os riscos ocupacionais existentes no local?",
          "1.4.1 'c'",
        ],
        ["Há divulgação dos resultados das avaliações ambientais aos trabalhadores?", "1.5.7.3.4"],
      ]),
      ...q("Capacitação e Treinamento", [
        ["Existe controle documentado de treinamentos iniciais, periódicos e eventuais?", "1.7.1"],
        [
          "Os certificados de treinamento contêm carga horária, conteúdo, data e responsável técnico?",
          "1.7.3",
        ],
        [
          "Os treinamentos são realizados durante a jornada de trabalho e sem ônus ao trabalhador?",
          "1.7.2",
        ],
      ]),
      ...q("Documentação e Responsabilidades", [
        ["Os documentos do PGR estão disponíveis aos trabalhadores e à fiscalização?", "1.5.7.4"],
        ["Há responsável técnico legalmente habilitado identificado no PGR?", "1.5.7.2"],
        ["Os acidentes e doenças ocupacionais são investigados e registrados?", "1.5.5.4"],
      ]),
    ],
  },
  {
    codigo: "NR-04",
    titulo: "Serviços Especializados em Segurança e Medicina do Trabalho (SESMT)",
    descricao: "Dimensionamento, registro e funcionamento do SESMT.",
    perguntas: [
      ...q("Dimensionamento", [
        [
          "O grau de risco e o número de trabalhadores foram utilizados corretamente no dimensionamento?",
          "Quadro II",
        ],
        ["A empresa possui SESMT dimensionado conforme o Quadro II da NR-04?", "4.4.1"],
        [
          "Os profissionais do SESMT possuem registro profissional e especialização exigida?",
          "4.4.2",
        ],
        ["O SESMT está registrado no órgão regional do Ministério do Trabalho / eSocial?", "4.6"],
      ]),
      ...q("Funcionamento", [
        ["Os profissionais do SESMT cumprem jornada integral no estabelecimento?", "4.4.3"],
        [
          "Há registro das atividades do SESMT (relatórios, inspeções, análises de acidentes)?",
          "4.5",
        ],
        ["O SESMT participa da elaboração e acompanhamento do PGR e do PCMSO?", "4.5.1"],
        ["Existem estatísticas de acidentes e doenças mantidas pelo SESMT?", "4.5.2"],
        ["O SESMT promove campanhas e treinamentos de prevenção?", "4.5.3"],
      ]),
    ],
  },
  {
    codigo: "NR-05",
    titulo: "CIPA — Comissão Interna de Prevenção de Acidentes e de Assédio",
    descricao: "Constituição, eleição, funcionamento e treinamento da CIPA.",
    perguntas: [
      ...q("Constituição", [
        ["A empresa possui CIPA dimensionada conforme os Quadros I e II da NR-05?", "5.3"],
        [
          "Havendo dispensa de CIPA, foi designado responsável treinado pelo cumprimento da norma?",
          "5.3.3",
        ],
        [
          "O processo eleitoral foi realizado com edital, inscrição e votação secreta documentados?",
          "5.5",
        ],
        ["A CIPA está registrada e com mandato vigente?", "5.5.7"],
      ]),
      ...q("Funcionamento", [
        ["As reuniões ordinárias mensais ocorrem e são registradas em ata?", "5.6.1"],
        ["A CIPA elabora e acompanha o plano de trabalho anual?", "5.4.1 'b'"],
        ["A CIPA realiza inspeções periódicas nos ambientes de trabalho?", "5.4.1 'a'"],
        ["A CIPA participa da análise de acidentes e das investigações?", "5.4.1 'e'"],
        ["O Mapa de Riscos (quando aplicável) está elaborado e divulgado?", "5.4.1 'a'"],
      ]),
      ...q("Treinamento e Assédio", [
        ["Os membros titulares e suplentes receberam treinamento de CIPA?", "5.7"],
        [
          "A empresa adota medidas de prevenção e combate ao assédio sexual e violências?",
          "5.4.1 'j'",
        ],
        [
          "Os trabalhadores foram capacitados sobre prevenção do assédio nos últimos 12 meses?",
          "5.4.1 'j'",
        ],
        [
          "Existe canal de denúncia com garantia de anonimato divulgado aos trabalhadores?",
          "5.4.1 'j'",
        ],
      ]),
    ],
  },
  {
    codigo: "NR-06",
    titulo: "Equipamento de Proteção Individual (EPI)",
    descricao: "Fornecimento, CA, treinamento, higienização e controle de entrega de EPIs.",
    perguntas: [
      ...q("Fornecimento e CA", [
        ["Os EPIs são fornecidos gratuitamente aos trabalhadores?", "6.3"],
        ["Todos os EPIs em uso possuem Certificado de Aprovação (CA) válido?", "6.2"],
        ["Os EPIs são adequados aos riscos identificados no inventário de riscos?", "6.3 'a'"],
        [
          "Há EPI disponível em quantidade e tamanhos suficientes para todos os trabalhadores?",
          "6.6.1",
        ],
        ["Os EPIs danificados ou extraviados são substituídos imediatamente?", "6.6.1 'e'"],
      ]),
      ...q("Controle e Registro", [
        ["Existe ficha de entrega de EPI assinada por cada trabalhador?", "6.6.1 'h'"],
        ["A ficha registra o CA, data de entrega, troca e motivo da substituição?", "6.6.1 'h'"],
        ["Há controle de validade e vida útil dos EPIs em estoque?", "6.6.1 'e'"],
      ]),
      ...q("Uso, Higienização e Treinamento", [
        [
          "Os trabalhadores foram orientados/treinados quanto ao uso, guarda e conservação do EPI?",
          "6.6.1 'd'",
        ],
        ["Observou-se o uso efetivo dos EPIs durante a inspeção em campo?", "6.7.1 'a'"],
        ["A higienização e manutenção periódica dos EPIs é realizada e registrada?", "6.6.1 'f'"],
        ["Existe local adequado para guarda e conservação dos EPIs?", "6.6.1 'f'"],
      ]),
    ],
  },
  {
    codigo: "NR-07",
    titulo: "PCMSO — Programa de Controle Médico de Saúde Ocupacional",
    descricao: "Exames ocupacionais, ASO, relatório analítico e ações de saúde.",
    perguntas: [
      ...q("Programa", [
        ["A empresa possui PCMSO elaborado por médico responsável e vigente?", "7.3.1"],
        ["O PCMSO está compatível com os riscos do inventário de riscos do PGR?", "7.4.1"],
        ["Existe relatório analítico anual do PCMSO?", "7.6.1"],
        ["O médico coordenador está identificado com CRM e especialidade?", "7.3.2"],
      ]),
      ...q("Exames e ASO", [
        ["São realizados exames admissionais antes do início das atividades?", "7.5.2 'a'"],
        ["Os exames periódicos estão em dia para todos os trabalhadores?", "7.5.2 'b'"],
        [
          "São realizados exames de retorno ao trabalho após afastamento superior a 30 dias?",
          "7.5.2 'c'",
        ],
        ["São realizados exames de mudança de riscos ocupacionais?", "7.5.2 'd'"],
        ["Os exames demissionais são realizados dentro do prazo legal?", "7.5.2 'e'"],
        ["Os ASOs contêm todos os campos obrigatórios e estão arquivados?", "7.5.9"],
        ["Os exames complementares exigidos pelos riscos estão sendo realizados?", "Anexos"],
      ]),
      ...q("Primeiros Socorros e Registros", [
        ["Existe material de primeiros socorros disponível e pessoa treinada para uso?", "7.5.16"],
        ["Os prontuários médicos são mantidos por no mínimo 20 anos?", "7.5.11"],
        ["Casos de doença ocupacional geram emissão de CAT?", "7.5.15"],
      ]),
    ],
  },
  {
    codigo: "NR-09",
    titulo:
      "Avaliação e Controle das Exposições Ocupacionais a Agentes Físicos, Químicos e Biológicos",
    descricao: "Avaliação quantitativa, limites de tolerância e medidas de controle.",
    perguntas: [
      ...q("Avaliação", [
        ["Os agentes físicos, químicos e biológicos foram identificados por GES/função?", "9.3.1"],
        [
          "Foram realizadas avaliações quantitativas quando exigido (ruído, calor, químicos)?",
          "9.3.3",
        ],
        ["As avaliações seguem as metodologias das NHO/FUNDACENTRO ou equivalentes?", "9.3.4"],
        ["Os resultados foram comparados aos limites de tolerância aplicáveis?", "9.4.1"],
        ["Os laudos e certificados de calibração dos equipamentos estão disponíveis?", "9.3.5"],
      ]),
      ...q("Controle", [
        ["Existem medidas de controle implantadas quando ultrapassado o nível de ação?", "9.4.2"],
        [
          "A hierarquia de controle (eliminação > coletiva > administrativa > EPI) é respeitada?",
          "9.4.3",
        ],
        ["Há monitoramento periódico da eficácia das medidas adotadas?", "9.5.1"],
        ["Os trabalhadores expostos são informados dos resultados das avaliações?", "9.6.1"],
        ["Os dados de exposição são mantidos por 20 anos?", "9.6.2"],
      ]),
    ],
  },
  {
    codigo: "NR-10",
    titulo: "Segurança em Instalações e Serviços em Eletricidade",
    descricao: "Prontuário, aterramento, desenergização, EPIs e capacitação elétrica.",
    perguntas: [
      ...q("Documentação", [
        ["Existe Prontuário das Instalações Elétricas (PIE) atualizado?", "10.2.4"],
        ["Os diagramas unifilares estão atualizados e disponíveis?", "10.2.4 'a'"],
        ["Existem procedimentos de trabalho escritos para serviços em eletricidade?", "10.11.1"],
        ["Há laudo de inspeção e manutenção das instalações elétricas?", "10.2.4 'e'"],
      ]),
      ...q("Medidas de Controle", [
        ["Os quadros elétricos estão sinalizados, identificados e mantidos fechados?", "10.10.1"],
        [
          "O sistema de aterramento está implantado e com medição de resistência registrada?",
          "10.2.8.3",
        ],
        ["Existem dispositivos de seccionamento com bloqueio e etiquetagem (LOTO)?", "10.5.1"],
        ["A sequência de desenergização/reenergização é seguida e documentada?", "10.5.1 e 10.5.3"],
        ["Não há emendas ou fiações improvisadas/expostas nos ambientes inspecionados?", "10.2.3"],
        ["Existe proteção contra descargas atmosféricas (SPDA) com laudo vigente?", "10.2.4 'e'"],
      ]),
      ...q("Capacitação e EPI", [
        [
          "Os trabalhadores possuem curso básico NR-10 (40h) válido e reciclagem bienal?",
          "Anexo II",
        ],
        ["Trabalhadores em SEP possuem o curso complementar (40h)?", "Anexo II"],
        [
          "São utilizadas vestimentas antichama com classe de proteção adequada ao risco térmico?",
          "10.2.9.2",
        ],
        ["Os EPIs e ferramentas isoladas passam por testes/inspeções periódicas?", "10.2.9.1"],
        [
          "Existe autorização formal dos trabalhadores autorizados a intervir nas instalações?",
          "10.8.1",
        ],
      ]),
    ],
  },
  {
    codigo: "NR-11",
    titulo: "Transporte, Movimentação, Armazenagem e Manuseio de Materiais",
    descricao: "Empilhadeiras, elevadores de carga, sinalização e armazenamento.",
    perguntas: [
      ...q("Equipamentos", [
        [
          "Os equipamentos de transporte possuem indicação de carga máxima permitida em local visível?",
          "11.1.2",
        ],
        [
          "Empilhadeiras possuem protetor superior, sinal sonoro de ré e cinto de segurança?",
          "11.1.6",
        ],
        ["Os operadores possuem treinamento e cartão/credencial de operação válido?", "11.1.5"],
        ["Existe checklist diário de inspeção dos equipamentos de movimentação?", "11.1.3"],
        ["Cabos, correntes e acessórios de içamento são inspecionados periodicamente?", "11.1.3.1"],
      ]),
      ...q("Circulação e Armazenagem", [
        ["As vias de circulação estão demarcadas, desobstruídas e sinalizadas?", "11.3.1"],
        ["O empilhamento respeita a altura máxima e a estabilidade das cargas?", "11.3.4"],
        ["Há separação entre circulação de pedestres e de equipamentos motorizados?", "11.3.1"],
        ["O piso é resistente e sem irregularidades que comprometam a movimentação?", "11.3.2"],
        [
          "Materiais inflamáveis/perigosos são armazenados em local específico e sinalizado?",
          "11.3.5",
        ],
      ]),
    ],
  },
  {
    codigo: "NR-12",
    titulo: "Segurança no Trabalho em Máquinas e Equipamentos",
    descricao: "Proteções, dispositivos de parada, inventário e capacitação.",
    perguntas: [
      ...q("Inventário e Documentação", [
        ["Existe inventário de máquinas e equipamentos atualizado?", "12.1.2"],
        ["Há apreciação de riscos das máquinas com medidas de proteção definidas?", "12.1.3"],
        ["Os manuais de operação e manutenção estão disponíveis em português?", "12.11.1"],
        ["Existe registro das manutenções preventivas e corretivas?", "12.10.2"],
      ]),
      ...q("Proteções e Dispositivos", [
        ["As zonas de perigo possuem proteções fixas ou móveis com intertravamento?", "12.4.1"],
        [
          "Os dispositivos de parada de emergência estão acessíveis, sinalizados e funcionais?",
          "12.5.1",
        ],
        [
          "Partes móveis (polias, correias, engrenagens) estão devidamente enclausuradas?",
          "12.4.2",
        ],
        ["Os comandos de acionamento impedem partida acidental?", "12.6.1"],
        ["Há sistema de bloqueio (LOTO) para manutenção e limpeza das máquinas?", "12.10.3"],
        ["Os aterramentos elétricos das máquinas estão íntegros?", "12.3.9"],
        ["A sinalização de segurança das máquinas está presente e legível?", "12.8.1"],
      ]),
      ...q("Capacitação e Ergonomia", [
        ["Os operadores foram capacitados especificamente para a máquina que operam?", "12.13.1"],
        ["Os postos de trabalho nas máquinas atendem aos requisitos ergonômicos?", "12.9.1"],
        ["Existe procedimento de trabalho e segurança para cada máquina crítica?", "12.10.1"],
      ]),
    ],
  },
  {
    codigo: "NR-13",
    titulo: "Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos",
    descricao: "Inspeções, prontuários, válvulas de segurança e operadores habilitados.",
    perguntas: [
      ...q("Documentação", [
        [
          "Existe prontuário do equipamento com projeto, materiais e memorial de cálculo?",
          "13.4.1",
        ],
        ["Os registros de segurança e o livro de ocorrências estão atualizados?", "13.4.1 'c'"],
        [
          "As inspeções inicial, periódica e extraordinária estão em dia com laudo de PH?",
          "13.4.4",
        ],
        ["A categoria dos vasos de pressão está corretamente classificada?", "Anexo IV"],
      ]),
      ...q("Segurança Operacional", [
        ["As válvulas de segurança são calibradas/inspecionadas periodicamente?", "13.4.2.5"],
        [
          "Instrumentos de controle (manômetro, pressostato, nível) estão íntegros e aferidos?",
          "13.4.2.1",
        ],
        [
          "A casa de caldeiras atende aos requisitos de ventilação e saídas de emergência?",
          "13.4.3.1",
        ],
        ["Existe placa de identificação afixada ao equipamento?", "13.4.1.4"],
        [
          "Os operadores possuem treinamento de segurança na operação exigido pela norma?",
          "13.4.4.1",
        ],
        ["Existe procedimento escrito de operação, partida e parada de emergência?", "13.4.3.4"],
      ]),
    ],
  },
  {
    codigo: "NR-15",
    titulo: "Atividades e Operações Insalubres",
    descricao: "Caracterização e neutralização da insalubridade.",
    perguntas: [
      ...q("Caracterização", [
        ["Existe laudo técnico (LTI) caracterizando ou descaracterizando a insalubridade?", "15.4"],
        [
          "As avaliações quantitativas de ruído, calor e agentes químicos foram realizadas?",
          "Anexos 1, 3, 11",
        ],
        ["Agentes biológicos foram avaliados qualitativamente conforme Anexo 14?", "Anexo 14"],
        ["O grau de insalubridade (10%, 20% ou 40%) está definido por função?", "15.2"],
      ]),
      ...q("Neutralização e Pagamento", [
        ["As medidas de controle adotadas eliminam ou neutralizam a insalubridade?", "15.4.1"],
        ["O adicional de insalubridade está sendo pago conforme o laudo?", "15.2"],
        [
          "Há evidência de eficácia dos EPIs na neutralização (CA, uso efetivo, treinamento)?",
          "15.4.1 'b'",
        ],
        ["O eSocial (S-2240) reflete corretamente as exposições identificadas?", "—"],
      ]),
    ],
  },
  {
    codigo: "NR-16",
    titulo: "Atividades e Operações Perigosas",
    descricao:
      "Periculosidade por inflamáveis, explosivos, energia elétrica, radiação e motocicleta.",
    perguntas: [
      ...q("Caracterização", [
        [
          "Existe laudo técnico de periculosidade (LTP) elaborado por profissional habilitado?",
          "16.1",
        ],
        ["Foram avaliadas as áreas de risco com inflamáveis e explosivos?", "Anexos 1 e 2"],
        [
          "Atividades com energia elétrica em SEP foram avaliadas quanto à periculosidade?",
          "Anexo 4",
        ],
        ["Atividades com radiações ionizantes/substâncias radioativas foram avaliadas?", "Anexo 5"],
        ["Atividades com motocicleta foram consideradas na avaliação?", "Anexo 5"],
        ["Atividades de segurança pessoal ou patrimonial foram avaliadas?", "Anexo 3"],
      ]),
      ...q("Gestão", [
        ["O adicional de periculosidade (30%) está sendo pago aos expostos?", "16.2"],
        ["O laudo é revisado quando há mudança de layout, processo ou produto?", "16.1"],
        ["Os trabalhadores foram informados sobre as áreas de risco e sua sinalização?", "16.6"],
      ]),
    ],
  },
  {
    codigo: "NR-17",
    titulo: "Ergonomia",
    descricao:
      "AEP, mobiliário, levantamento de cargas, organização do trabalho e conforto ambiental.",
    perguntas: [
      ...q("Avaliação Ergonômica", [
        ["Existe Avaliação Ergonômica Preliminar (AEP) atualizada?", "17.3.1"],
        ["Foi elaborada Análise Ergonômica do Trabalho (AET) quando indicada pela AEP?", "17.3.2"],
        ["As recomendações ergonômicas possuem plano de ação com prazos e responsáveis?", "17.3.3"],
      ]),
      ...q("Mobiliário e Posto de Trabalho", [
        ["As bancadas e mesas possuem altura compatível com a atividade?", "17.5.1"],
        ["As cadeiras possuem regulagem de altura, encosto e são adequadas ao posto?", "17.5.2"],
        ["Há apoio para os pés quando necessário?", "17.5.2 'd'"],
        ["Os monitores estão posicionados na altura dos olhos e sem reflexos?", "17.6.4"],
        ["Trabalhadores em pé possuem pausas e assentos disponíveis para descanso?", "17.5.4"],
      ]),
      ...q("Levantamento de Cargas e Organização", [
        [
          "O transporte manual de cargas respeita os limites e há meios mecânicos disponíveis?",
          "17.4.1",
        ],
        ["Existem pausas e revezamento em atividades repetitivas?", "17.7.2"],
        ["O ritmo de trabalho e as metas não geram sobrecarga física ou mental?", "17.7.1"],
        ["Os fatores psicossociais foram considerados na avaliação?", "17.7.3"],
      ]),
      ...q("Conforto Ambiental", [
        ["Os níveis de iluminamento atendem à NBR ISO 8995-1 nos postos de trabalho?", "17.8.3"],
        ["O ruído em ambientes de atividade intelectual está abaixo de 65 dB(A)?", "17.8.2"],
        ["A temperatura e a velocidade do ar em ambientes climatizados são adequadas?", "17.8.1"],
      ]),
    ],
  },
  {
    codigo: "NR-18",
    titulo: "Segurança e Saúde no Trabalho na Indústria da Construção",
    descricao:
      "PGR da obra, áreas de vivência, proteções coletivas e trabalho em altura na construção.",
    perguntas: [
      ...q("Gestão da Obra", [
        ["Existe PGR específico da obra e comunicação prévia ao órgão regional?", "18.4.1"],
        ["Há profissional legalmente habilitado responsável pela segurança da obra?", "18.4.2"],
        [
          "Existe programa de treinamento admissional e periódico dos trabalhadores da obra?",
          "18.5.1",
        ],
      ]),
      ...q("Áreas de Vivência", [
        ["Existem instalações sanitárias em número suficiente e em boas condições?", "18.20.2"],
        ["Há vestiário com armários individuais?", "18.20.3"],
        ["Há local para refeições limpo, coberto e com mesas e assentos?", "18.20.4"],
        ["Há fornecimento de água potável fresca em condições higiênicas?", "18.20.1"],
      ]),
      ...q("Proteções Coletivas e Estruturas", [
        ["As aberturas no piso e vãos estão protegidos com fechamento resistente?", "18.9.1"],
        ["As periferias da edificação possuem guarda-corpo e rodapé conforme norma?", "18.9.3"],
        ["Os andaimes estão montados por profissional qualificado, nivelados e travados?", "18.11"],
        ["As escadas provisórias e rampas possuem corrimão e são fixadas?", "18.10"],
        ["As instalações elétricas provisórias possuem quadros com DR e proteção?", "18.14"],
        ["As máquinas e ferramentas da obra possuem proteções e são inspecionadas?", "18.12"],
        ["Existe proteção contra queda de materiais (plataformas/telas)?", "18.9.5"],
        ["A área de armazenamento de materiais é organizada e sinalizada?", "18.19"],
      ]),
    ],
  },
  {
    codigo: "NR-20",
    titulo: "Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis",
    descricao: "Classificação da instalação, prontuário, plano de resposta e capacitação.",
    perguntas: [
      ...q("Classificação e Documentação", [
        ["A instalação foi classificada corretamente (Classe I, II ou III)?", "20.4"],
        ["Existe prontuário da instalação com projeto e laudos?", "20.5"],
        ["Há plano de resposta a emergências elaborado e testado?", "20.14"],
        ["Existem procedimentos operacionais escritos para manuseio de inflamáveis?", "20.8"],
      ]),
      ...q("Medidas de Segurança", [
        ["As áreas de armazenamento possuem contenção (dique/bacia) e sinalização?", "20.7"],
        ["Existe controle de fontes de ignição nas áreas classificadas?", "20.7.5"],
        ["O sistema de combate a incêndio é adequado e inspecionado periodicamente?", "20.13"],
        ["Há permissão de trabalho (PT) para serviços a quente em área classificada?", "20.10"],
        [
          "As FISPQ dos produtos estão disponíveis e os trabalhadores conhecem seu conteúdo?",
          "20.9",
        ],
      ]),
      ...q("Capacitação", [
        [
          "Os trabalhadores possuem capacitação nos níveis básico, intermediário ou avançado conforme função?",
          "20.11",
        ],
        ["A reciclagem da capacitação está dentro do prazo?", "20.11.7"],
        ["São realizados simulados de emergência periodicamente com registro?", "20.14.4"],
      ]),
    ],
  },
  {
    codigo: "NR-23",
    titulo: "Proteção Contra Incêndios",
    descricao: "Extintores, saídas de emergência, brigada e sinalização.",
    perguntas: [
      ...q("Equipamentos", [
        ["Os extintores estão em número, tipo e capacidade adequados ao risco?", "23.1"],
        ["Os extintores estão com carga válida, lacrados, sinalizados e desobstruídos?", "23.1"],
        ["Hidrantes e mangueiras estão íntegros e com teste hidrostático válido?", "23.1"],
        ["Existe sistema de detecção/alarme de incêndio funcional?", "23.1 'c'"],
        ["A iluminação de emergência está funcional nas rotas de fuga?", "23.1 'b'"],
      ]),
      ...q("Saídas e Brigada", [
        [
          "As saídas de emergência estão sinalizadas, desobstruídas e com abertura no sentido da fuga?",
          "23.1 'b'",
        ],
        ["As rotas de fuga estão demarcadas no piso/parede e livres?", "23.1 'b'"],
        ["Existe brigada de incêndio treinada e identificada?", "23.1 'd'"],
        ["Há plano de emergência com pontos de encontro definidos?", "23.1 'd'"],
        ["São realizados exercícios de abandono (simulados) com registro?", "23.1 'd'"],
        ["O AVCB / CLCB do corpo de bombeiros está vigente?", "—"],
      ]),
    ],
  },
  {
    codigo: "NR-24",
    titulo: "Condições Sanitárias e de Conforto nos Locais de Trabalho",
    descricao: "Sanitários, vestiários, refeitórios e água potável.",
    perguntas: [
      ...q("Instalações Sanitárias", [
        ["Há um conjunto sanitário para cada 20 trabalhadores (ou proporção aplicável)?", "24.2"],
        ["Os sanitários são separados por sexo e mantidos limpos e higienizados?", "24.2.2"],
        ["Há papel higiênico, sabonete e meio para secagem das mãos disponíveis?", "24.2.4"],
        ["Os chuveiros são fornecidos quando a atividade exige (calor/insalubridade)?", "24.2.6"],
      ]),
      ...q("Vestiários, Refeitório e Água", [
        ["Existe vestiário com armários individuais quando exigido troca de roupa?", "24.3"],
        ["Existe local adequado para refeições, fora do posto de trabalho?", "24.4"],
        [
          "O refeitório/copa possui condições de higiene, ventilação e assentos suficientes?",
          "24.4.2",
        ],
        ["Há fornecimento de água potável em condições higiênicas e copos individuais?", "24.7"],
        ["Existem alojamentos regulares quando aplicável?", "24.5"],
      ]),
    ],
  },
  {
    codigo: "NR-26",
    titulo: "Sinalização de Segurança",
    descricao: "Cores, rotulagem preventiva e comunicação de perigos químicos (GHS).",
    perguntas: [
      ...q("Sinalização", [
        ["As tubulações e equipamentos estão identificados com as cores padronizadas?", "26.1"],
        ["A sinalização de segurança está visível, íntegra e compreensível?", "26.1.1"],
        ["Áreas de risco e obstáculos estão devidamente demarcados?", "26.1.3"],
      ]),
      ...q("Produtos Químicos", [
        ["Os produtos químicos estão rotulados conforme o GHS (pictogramas e frases)?", "26.2"],
        ["As FISPQ estão disponíveis, em português e acessíveis aos trabalhadores?", "26.2.4"],
        [
          "Os trabalhadores foram capacitados sobre os perigos dos produtos químicos utilizados?",
          "26.2.5",
        ],
        ["Produtos transferidos para recipientes menores mantêm a identificação?", "26.2.3"],
      ]),
    ],
  },
  {
    codigo: "NR-33",
    titulo: "Segurança e Saúde nos Trabalhos em Espaços Confinados",
    descricao: "Identificação, PET, monitoramento atmosférico, vigia e capacitação.",
    perguntas: [
      ...q("Identificação e Gestão", [
        [
          "Todos os espaços confinados foram identificados, sinalizados e cadastrados?",
          "33.3.1 'a'",
        ],
        ["Existe procedimento escrito para entrada e trabalho em espaço confinado?", "33.3.1 'c'"],
        ["A Permissão de Entrada e Trabalho (PET) é emitida e arquivada por 5 anos?", "33.3.4.1"],
        ["Existe plano de resgate e equipe capacitada disponível durante os trabalhos?", "33.3.5"],
      ]),
      ...q("Controle Operacional", [
        [
          "O monitoramento atmosférico (O2, inflamáveis, tóxicos) é feito antes e durante a entrada?",
          "33.3.4.4",
        ],
        ["Os detectores de gases estão calibrados com certificado válido?", "33.3.4.4"],
        ["Há ventilação/exaustão adequada e bloqueio de energias perigosas?", "33.3.4.5"],
        ["O vigia permanece do lado externo durante toda a atividade?", "33.3.4.3"],
        [
          "Equipamentos de resgate (tripé, talabarte, SCBA) estão disponíveis e inspecionados?",
          "33.3.5.3",
        ],
      ]),
      ...q("Capacitação", [
        ["Trabalhadores autorizados e vigias possuem curso de 16h e reciclagem anual?", "33.3.5.1"],
        ["Supervisores de entrada possuem capacitação de 40h e reciclagem anual?", "33.3.5.2"],
      ]),
    ],
  },
  {
    codigo: "NR-35",
    titulo: "Trabalho em Altura",
    descricao: "Análise de risco, PT, sistemas de ancoragem, EPIs e capacitação.",
    perguntas: [
      ...q("Planejamento", [
        ["Existe procedimento operacional para trabalho em altura?", "35.4.5"],
        ["É realizada Análise de Risco (AR) para as atividades em altura?", "35.4.5.1"],
        ["A Permissão de Trabalho (PT) é emitida para atividades não rotineiras?", "35.4.6"],
        ["Existe plano de emergência e resgate específico para trabalho em altura?", "35.6.1"],
      ]),
      ...q("Sistemas e Equipamentos", [
        ["Os pontos de ancoragem foram dimensionados por profissional habilitado?", "35.5.2"],
        ["Os cintos tipo paraquedista e talabartes possuem CA e inspeção registrada?", "35.5.1"],
        [
          "Os sistemas de proteção contra quedas (linha de vida, trava-quedas) estão instalados?",
          "35.5.3",
        ],
        [
          "Escadas, andaimes e plataformas elevatórias estão em condições seguras de uso?",
          "35.5.4",
        ],
        ["A área abaixo do trabalho em altura é isolada e sinalizada?", "35.4.5.1 'g'"],
      ]),
      ...q("Trabalhadores e Capacitação", [
        ["Os trabalhadores possuem capacitação de 8h com reciclagem bienal?", "35.3.1"],
        ["Existe autorização formal para trabalho em altura com aptidão no ASO?", "35.2.1"],
        ["É realizada avaliação prévia das condições de saúde antes da atividade?", "35.3.3"],
        ["Trabalhos em altura são suspensos em condições meteorológicas adversas?", "35.4.4"],
      ]),
    ],
  },
];

export function getChecklist(codigo: string): NrChecklist | undefined {
  return NR_CHECKLISTS.find((c) => c.codigo === codigo);
}

export const RESPOSTAS = [
  { value: "conforme", label: "Conforme" },
  { value: "nao_conforme", label: "Não conforme" },
  { value: "nao_aplicavel", label: "Não aplicável" },
  { value: "nao_avaliado", label: "Não avaliado" },
] as const;

export type RespostaValue = (typeof RESPOSTAS)[number]["value"];

export function respostaLabel(v: string): string {
  return RESPOSTAS.find((r) => r.value === v)?.label ?? v;
}
