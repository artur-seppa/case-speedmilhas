import { SupplierName } from '../../suppliers/normalized-offer';

export interface PassengerResponseDto {
  nome: string;
  cpf: string;
}

export interface OrderResponseDto {
  orderId: string;
  quoteId: string;
  supplier: SupplierName;
  carrier: string;
  miles: number;
  taxesBrl: number;
  passageiro: PassengerResponseDto;
  createdAt: string;
}
