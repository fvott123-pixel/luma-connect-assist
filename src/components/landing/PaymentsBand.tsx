import { useLanguage } from "@/contexts/LanguageContext";

const PaymentsBand = () => {
  const { t } = useLanguage();
  const items = [
    { amount: "$1,116/fn", labelKey: "payments.dsp" },
    { amount: "$1,020/fn", labelKey: "payments.agePension" },
    { amount: "$800+/fn", labelKey: "payments.carer" },
    { amount: "Free", labelKey: "payments.medicare" },
    { amount: "$29K/yr", labelKey: "payments.avgValue" },
  ];

  return (
    <section className="border-y border-gold/25 bg-gold-bg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center divide-x divide-gold/20 py-6">
        {items.map((item) => (
          <div key={item.labelKey} className="px-6 py-2 text-center sm:px-8">
            <div className="font-serif text-2xl font-bold text-gold">{item.amount}</div>
            <div className="text-xs font-bold text-ink-body">{t(item.labelKey)}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PaymentsBand;
