const QUESTIONS = [
  'Which Karnataka districts are ready for premium FMCG distribution?',
  'Where is refrigeration and cold-chain infrastructure strongest — and weakest?',
  'Which taluks remain structurally underserved by General Trade?',
  'Where should a D2C brand launch its first offline distribution in Karnataka?',
  'How digitally mature is retail across the state — billing, payments, online sales?',
  'Which retail clusters carry the least brand competition today?',
]

export function BusinessQuestions() {
  return (
    <section className="border-t border-[#e6e3da] pt-14">
      <div className="mb-10 max-w-2xl">
        <p className="font-mono text-[16.5px] font-semibold uppercase tracking-[0.14em] text-accent-900">Real Business Questions</p>
        <h2 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] tracking-tight text-navy-900 sm:text-[34px]">
          Questions This Census Was Built to Answer
        </h2>
      </div>

      <div className="grid grid-cols-1 border-t border-[#e6e3da] sm:grid-cols-2">
        {QUESTIONS.map((q, i) => (
          <div
            key={q}
            className={`border-b border-[#e6e3da] py-7 pr-8 sm:py-9 ${i % 2 === 0 ? 'sm:border-r' : ''}`}
          >
            <span className="block h-1 w-8 rounded-full bg-accent-900/70" aria-hidden />
            <p className="mt-4 font-serif text-[19px] font-medium leading-snug tracking-tight text-navy-900 sm:text-[21px]">{q}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
