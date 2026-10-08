export { default } from "@/features/visitors/VisitorsScreen";
// O leitor de comprovante (feature `passCheck`) desfaz o que o comprovante escreve; o prefixo do QR
// continua existindo só no domínio desta feature.
export { passCodeOf } from "@/features/visitors/domain/visitor";
