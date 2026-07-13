# Planner de Aeronaves e Missões

App web simples para controlar aeronaves, missões e disponibilidade em um calendário mensal.

## Como rodar

Abra o arquivo `index.html` no navegador.

Se preferir servir localmente:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Como testar

1. Cadastre algumas aeronaves na aba **Aeronaves**.
2. Marque capacidades como VFR, IFR, OVN, gancho, guincho e braço de armamento.
3. Crie uma missão na aba **Missões** com período, tipo de voo e requisitos.
4. Veja se os dropdowns mostram somente aeronaves compatíveis e sem conflito de datas.
5. Abra a aba **Planner** e confira a barra da missão atravessando os dias do calendário.
6. Clique na barra da missão para ver detalhes, editar ou excluir.
7. Use **Importação** para colar um texto de missão e revisar antes de salvar.
8. Em **Importar O Frag / OMA**, selecione um PDF com texto, revise os campos extraídos e confirme se deseja criar ou atualizar uma missão semelhante.
9. Em **Sincronização do Google Sheets**, teste a conexão com a aba `MISSÕES`, revise a prévia e aplique somente as alterações desejadas.
10. Use **Exportar JSON** e **Importar JSON** para testar backup.

## Status das missões

- Missões ativas usam o status `planned`; missões antigas recebem esse status automaticamente.
- **Cancelar missão** mantém todos os dados e as aeronaves originalmente designadas, mas libera essas aeronaves para outros planejamentos.
- Missões canceladas permanecem no planner e aparecem em vermelho com a indicação **CANCELADA**.
- Ao reativar, o app verifica conflitos e permite manter ou remover as aeronaves conflitantes.
- A lista de missões pode ser filtrada entre todas, ativas e canceladas.
- O planner mostra missões canceladas por padrão; a opção **Mostrar canceladas** pode ocultá-las temporariamente.

## Importação de O Frag / OMA

- A leitura usa uma cópia local do PDF.js e não envia o documento para serviços externos.
- A extração procura somente dados relacionados à 1ª EHEG e sempre exige revisão antes de salvar.
- PDFs que contêm apenas imagens digitalizadas ainda precisam de OCR e não terão texto extraído nesta versão.
- O app compara OMA, O Frag, período, tropa, localização e nome com as missões existentes.
- Ao atualizar, o ID, as aeronaves designadas e as observações anteriores são preservados.

## Sincronização Google Sheets

- A integração lê a aba `MISSÕES` no sentido Google Sheets → app; ela não escreve nem altera dados na planilha.
- O modo **Link/CSV** funciona quando a planilha está publicada ou acessível por link.
- Se a planilha for privada, use **Conta Google** com um Client ID OAuth e escopo somente leitura: `spreadsheets.readonly`.
- O parser usa as colunas reais: Missão, Local, Data, HV, Anv, PO, PO/PT, PT, MV e PERNOITES.
- Células mescladas são tratadas por preenchimento descendente de Missão, Local, HV e Data dentro do bloco.
- Linhas consecutivas da mesma missão são agrupadas em um único objeto com `dailyPlanning`, `aircraftSchedule` e `crewSchedule`.
- O planner usa a quantidade diária quando a missão possui programação importada da planilha.
- Antes de aplicar, o app mostra uma revisão com novas missões, atualizações prováveis, duplicidades, erros de data e avisos.

## Dados

Os dados ficam salvos localmente no navegador via `localStorage`. Não há login nem servidor nesta primeira versão.

O PDF.js está incluído em `vendor/pdfjs`, sob a licença Apache 2.0 disponível nessa mesma pasta.
