/**
 * Texts the seller accepts, with versions recorded on each acceptance. Bump
 * the version when the text changes; the seller-terms version also lives in
 * the database (`current_seller_terms_version()`), so changing it needs a
 * migration that returns the new value.
 *
 * RASCUNHO para revisão humana (jurídico/contábil) antes do lançamento.
 */

export const SELLER_TERMS_VERSION = "2026-11-v1";

export const SELLER_TERMS_TITLE = "Termos do vendedor de produtos físicos";

export const SELLER_TERMS_SECTIONS: readonly { title: string; body: string }[] = [
  {
    title: "Você é o vendedor",
    body:
      "Ao vender produtos físicos na Vippin, você é o vendedor e responde pelo produto, pela embalagem, pelo prazo de envio e pelo documento fiscal de cada venda. A Vippin intermedeia o pagamento e o envio.",
  },
  {
    title: "Documento fiscal",
    body:
      "Empresas emitem NF-e em toda venda. MEIs devem preferir NF-e (o emissor gratuito da SEFAZ atende). A declaração de conteúdo (DC-e) só é aceita para pessoa física em venda eventual, dentro do limite mensal da plataforma, e você declara que o conteúdo do pacote corresponde ao produto vendido.",
  },
  {
    title: "Itens proibidos",
    body:
      "É proibido vender ou enviar os itens da lista de itens proibidos da Vippin e dos Correios. Você responde por qualquer envio irregular.",
  },
  {
    title: "Pagamento retido até a entrega",
    body:
      "O valor da venda fica retido pela Vippin até a entrega e por mais 7 dias, prazo do direito de arrependimento do comprador. Se o envio não for preparado ou postado no prazo, o comprador é reembolsado automaticamente.",
  },
  {
    title: "Arrependimento e devoluções",
    body:
      "O comprador pode desistir da compra em até 7 dias após a entrega (Código de Defesa do Consumidor, art. 49). Nesse caso o valor é reembolsado ao comprador e o frete da devolução é cobrado de você.",
  },
];

export const DCE_DECLARATION_VERSION = "2026-11-v1";

export const DCE_DECLARATION_TEXT =
  "Declaro que o conteúdo do pacote corresponde ao produto vendido, que esta é uma venda eventual de pessoa física (ou MEI) e que sou responsável pela declaração de conteúdo deste envio.";

/** Correios + Vippin (resumo). */
export const PROHIBITED_ITEMS: readonly string[] = [
  "Armas, munições, explosivos e fogos de artifício",
  "Drogas, medicamentos controlados e substâncias ilícitas",
  "Produtos inflamáveis, corrosivos, tóxicos ou radioativos (incluindo aerossóis e baterias soltas de lítio)",
  "Dinheiro, cheques, cartões, joias e metais preciosos",
  "Animais vivos ou mortos e plantas",
  "Alimentos perecíveis",
  "Produtos falsificados, pirateados ou que violem direitos autorais",
  "Conteúdo adulto ou ilegal",
  "Bebidas alcoólicas e produtos de tabaco ou cigarro eletrônico",
];
