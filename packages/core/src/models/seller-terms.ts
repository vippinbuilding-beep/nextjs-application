/** A seller's acceptance of a version of the Termos do vendedor. */
export interface SellerTermsAcceptance {
  id: string;
  userId: string;
  termsVersion: string;
  acceptedAt: Date;
}
