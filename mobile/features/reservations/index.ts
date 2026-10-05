/**
 * API pública da feature de reservas.
 *
 * As duas telas: o catálogo e a reserva de um local. Nenhuma outra feature consome o domínio nem os
 * componentes desta, então nada mais é exportado — o que não está aqui é interno (Princípio I).
 */
export { default as ReservationsScreen } from "@/features/reservations/ReservationsScreen";
export { default as BookingScreen } from "@/features/reservations/BookingScreen";
