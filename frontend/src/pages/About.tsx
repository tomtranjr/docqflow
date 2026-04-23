import { FileText, Cpu, Database, BarChart3 } from 'lucide-react'

const PIPELINE_STEPS = [
  {
    icon: FileText,
    title: 'PDF Ingestion',
    desc: 'Extract text from uploaded PDF documents using PyMuPDF',
  },
  {
    icon: Cpu,
    title: 'TF-IDF + LogReg',
    desc: 'Classify documents using TF-IDF vectorization and Logistic Regression',
  },
  {
    icon: Database,
    title: 'History Tracking',
    desc: 'Store classification results in SQLite for review and audit',
  },
  {
    icon: BarChart3,
    title: 'MLflow Integration',
    desc: 'Track experiments, metrics, and model versions with MLflow',
  },
]

export function About() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-[var(--color-text-primary)]">About DocQFlow</h1>
      <p className="mb-8 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        DocQFlow is an intelligent PDF document classification system built for municipal document
        processing. It uses machine learning to automatically classify permit applications and other
        government documents.
      </p>

      <h2 className="mb-4 text-base font-semibold text-[var(--color-text-primary)]">Pipeline</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {PIPELINE_STEPS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded border border-[var(--color-border)] p-4">
            <Icon className="mb-2 h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{desc}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 mt-8 text-base font-semibold text-[var(--color-text-primary)]">Team</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Built by the MSDS 603 Machine Learning Ops team at USF.
      </p>
    </div>
  )
}
