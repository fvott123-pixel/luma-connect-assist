const items = [
  { amount: "$1,116/fn", label: "Disability Support Pension" },
  { amount: "$1,020/fn", label: "Age Pension" },
  { amount: "$800+/fn", label: "Carer Payment" },
  { amount: "Free", label: "Medicare Enrolment" },
  { amount: "$29K/yr", label: "Average annual value" },
];

const PaymentsBand = () => (
  <section className="border-y border-gold/25 bg-gold-bg">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center divide-x divide-gold/20 py-6">
      {items.map((item) => (
        <div key={item.label} className="px-6 py-2 text-center sm:px-8">
          <div className="font-serif text-2xl font-bold text-gold">{item.amount}</div>
          <div className="text-xs font-bold text-ink-body">{item.label}</div>
        </div>
      ))}
    </div>
  </section>
);

export default PaymentsBand;
