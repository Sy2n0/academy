import getSymbolFromCurrency from 'currency-symbol-map';

import { Price, Prisma, Service } from '@prisma/client';
import { Button } from '@/components/ui/button';

interface PaymentButtonProps {
  plan: Service;
  price: Price;
  initiateCheckout: (priceId: string, quantity?: number) => void;
}

const PaymentButton = ({
  plan,
  price,
  initiateCheckout,
}: PaymentButtonProps) => {
  const metadata = price.metadata as Prisma.JsonObject;
  const currencySymbol = getSymbolFromCurrency(price.currency || 'USD');
  let buttonText = 'Get Started';

  if (metadata?.interval === 'month') {
    buttonText = price.amount
      ? `${currencySymbol}${price.amount} / month`
      : `Monthly`;
  } else if (metadata?.interval === 'year') {
    buttonText = price.amount
      ? `${currencySymbol}${price.amount} / year`
      : `Yearly`;
  }

  return (
    <Button
      key={`${plan.id}-${price.id}`}
      variant="outline"
      size="md"
      className="w-full rounded-full"
      onClick={() => {
        initiateCheckout(
          price.id,
          (price.billingScheme == 'per_unit' ||
            price.billingScheme == 'tiered') &&
            metadata.usage_type !== 'metered'
            ? 1
            : undefined
        );
      }}
    >
      {buttonText}
    </Button>
  );
};

export default PaymentButton;
