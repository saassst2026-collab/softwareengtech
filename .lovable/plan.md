## Objetivo

Adicionar dois novos relatórios na aba **Documentos SST**, um controle de **isenção única** por empresa, e um relatório **"o que falta"** por empresa na aba **Empresas**.

---

## 1. Isenção única por empresa

Adicionar coluna `isencao_simplificada boolean default false` em `empresas`.

Quando marcada, a empresa é considerada **simplificada**: não precisa de PGR, PGRTR, PCMSO, LTI nem LTP. Precisa apenas de **LTCAT (com ART conferida)**, **AEP** e **Ordem de Serviço**.

Regra adicional (válida para todas as empresas): **PGR e PGRTR são mutuamente exclusivos** — basta a empresa ter um dos dois cadastrado para considerar esse requisito atendido. Não há isenção individual por tipo; só o toggle simplificado.

### UI

- Na aba **Documentos SST**, no cabeçalho do agrupamento de cada empresa (ao lado do nome), um botão/toggle "Empresa simplificada" (ícone shield). Estado salvo direto via update na linha de `empresas`. Badge visível quando ativo.
- Apenas admin/autor pode alternar (mesmas RLS já existentes).

---

## 2. Cálculo de "empresa 100% pronta"

Função utilitária nova `computarChecklistEmpresa(empresa, documentos)` em `src/lib/checklistEmpresa.ts`, usada pelos dois relatórios novos e pelo relatório "o que falta".

Requisitos por empresa:

- **LTCAT**: existe + `conferencia_ok = true` (ART). Validade ignorada (LTCAT não tem validade).
- **AEP**: existe (qualquer registro do tipo). Sem validade.
- **OS_SST**: existe. Sem validade.
- **PGR ou PGRTR**: pelo menos um dos dois existe + `conferencia_ok = true` (Registro Profissional). _Ignorado se `isencao_simplificada = true`._
- **PCMSO**: existe + `conferencia_ok = true` (Declaração). _Ignorado se isenta._
- **LTI**: existe + `conferencia_ok = true` (ART). _Ignorado se isenta._
- **LTP**: existe + `conferencia_ok = true` (ART). _Ignorado se isenta._

Retorno: `{ pronta: boolean, faltando: Array<{ requisito: string, motivo: "ausente" | "anexo_pendente" }> }`.

---

## 3. Novos relatórios na aba Documentos SST

Em `buildDocumentosOpcoes` adicionar duas opções:

### 3a. "Documentos sem anexo obrigatório"

Lista todos os documentos onde `tipoExigeConferencia(tipo) === true` e `conferencia_ok = false` (tipos: PGR, PGRTR, PCMSO, LTCAT, LTI, LTP — itens ART, Declaração, Registro Profissional).

Agrupado por empresa. Cada linha: Empresa | Documento | Item pendente (ART/Declaração/Registro Profissional) | Data emissão.

### 3b. "Empresas 100% prontas"

Lista empresas onde `computarChecklistEmpresa(...).pronta === true`. Inclui coluna "Tipo" (Completa / Simplificada) e a lista de documentos validados.

---

## 4. Novo relatório na aba Empresas: "O que falta por empresa"

Em `buildEmpresasOpcoes`, adicionar opção **"Pendências por empresa"**. Lista todas as empresas com `faltando.length > 0`, mostrando para cada uma os requisitos faltantes e o motivo (documento ausente ou anexo/conferência pendente). Empresas 100% prontas aparecem ao final marcadas como "OK" ou são omitidas (a definir — por padrão omitidas).

---

## 5. Detalhes técnicos

### Migration

- `ALTER TABLE public.empresas ADD COLUMN isencao_simplificada boolean NOT NULL DEFAULT false;`

### Arquivos a editar/criar

- `supabase/migrations/...sql` — adiciona coluna.
- `src/lib/checklistEmpresa.ts` (novo) — `computarChecklistEmpresa` + labels dos requisitos.
- `src/routes/_authenticated.documentos.tsx` — botão de isenção no header da empresa + duas opções novas em `buildDocumentosOpcoes`.
- `src/routes/_authenticated.empresas.tsx` — nova opção "Pendências por empresa" em `buildEmpresasOpcoes`.
- `src/lib/reportPdf.ts` — reutilizar layout existente; não precisa mudar a infra.

Sem alterações em conformidade, dashboard ou outros relatórios existentes.
