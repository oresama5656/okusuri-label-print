import { useEffect, useMemo, useState } from 'react'
import './App.css'

type PatientFields = {
  name: string
  birthDate: string
  address: string
  contact: string
  allergyNotes: string
  historyNotes: string
}

type Settings = {
  printerPreset: string
  pharmacyName: string
  pharmacyPhone: string
  pharmacistName: string
  kakaritsukeLabel: string
  printWidthMm: string
  printHeightMm: string
  printPaddingMm: string
}

const SETTINGS_STORAGE_KEY = 'okusuri-label-print:settings'

const DEFAULT_PATIENT_FIELDS: PatientFields = {
  name: '',
  birthDate: '',
  address: '',
  contact: '',
  allergyNotes: '',
  historyNotes: '',
}

const DEFAULT_SETTINGS: Settings = {
  printerPreset: 'move-cl-e300-lfx',
  pharmacyName: '',
  pharmacyPhone: '',
  pharmacistName: '',
  kakaritsukeLabel: 'かかりつけ',
  printWidthMm: '80',
  printHeightMm: '115',
  printPaddingMm: '5',
}

const PRINTER_PRESETS = {
  'move-cl-e300-lfx': {
    label: 'move CL-E300-LFX / 80 x 115 mm',
    printWidthMm: '80',
    printHeightMm: '115',
    printPaddingMm: '5',
  },
  genericA6: {
    label: '汎用 A6 / 105 x 148 mm',
    printWidthMm: '105',
    printHeightMm: '148',
    printPaddingMm: '8',
  },
} as const

function normalizeBirthDate(value: string) {
  const trimmed = value.trim()
  const slashMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (slashMatch) {
    const [, year, month, day] = slashMatch
    return `${year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日`
  }

  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compactMatch) {
    const [, year, month, day] = compactMatch
    return `${year}年${month}月${day}日`
  }

  return trimmed
}

function parseQuickPaste(input: string) {
  const cleaned = input.replace(/\r/g, '').trim()
  if (!cleaned) {
    return null
  }

  const rows = cleaned
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)

  if (rows.length === 1) {
    const cols = rows[0]
      .split('\t')
      .map((col) => col.trim())
      .filter(Boolean)

    if (cols.length >= 3) {
      return {
        name: cols[0],
        birthDate: normalizeBirthDate(cols[1]),
        contact: cols.slice(2).join(' '),
      }
    }
  }

  return {
    name: rows[0] ?? '',
    birthDate: normalizeBirthDate(rows[1] ?? ''),
    contact: rows.slice(2).join(' '),
  }
}

function App() {
  const [patient, setPatient] = useState(DEFAULT_PATIENT_FIELDS)
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_SETTINGS
    }

    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!raw) {
        return DEFAULT_SETTINGS
      }

      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  const [quickPaste, setQuickPaste] = useState('')

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const printStyle = useMemo(
    () =>
      ({
        '--sheet-width-mm': settings.printWidthMm || DEFAULT_SETTINGS.printWidthMm,
        '--sheet-height-mm': settings.printHeightMm || DEFAULT_SETTINGS.printHeightMm,
        '--sheet-padding-mm':
          settings.printPaddingMm || DEFAULT_SETTINGS.printPaddingMm,
      }) as React.CSSProperties,
    [settings.printHeightMm, settings.printPaddingMm, settings.printWidthMm],
  )

  const applyQuickPaste = () => {
    const parsed = parseQuickPaste(quickPaste)
    if (!parsed) {
      return
    }

    setPatient((current) => ({
      ...current,
      name: parsed.name,
      birthDate: parsed.birthDate,
      contact: parsed.contact,
    }))
  }

  const updatePatient = (key: keyof PatientFields, value: string) => {
    setPatient((current) => ({ ...current, [key]: value }))
  }

  const updateSettings = (key: keyof Settings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const applyPrinterPreset = (presetKey: keyof typeof PRINTER_PRESETS) => {
    const preset = PRINTER_PRESETS[presetKey]
    setSettings((current) => ({
      ...current,
      printerPreset: presetKey,
      printWidthMm: preset.printWidthMm,
      printHeightMm: preset.printHeightMm,
      printPaddingMm: preset.printPaddingMm,
    }))
  }

  const clearPatientFields = () => {
    setPatient(DEFAULT_PATIENT_FIELDS)
    setQuickPaste('')
  }

  return (
    <main className="app-shell">
      <section className="intro no-print">
        <div>
          <p className="eyebrow">院内向け / 患者保存なし</p>
          <h1>お薬手帳 記載票プリント</h1>
          <p className="intro-copy">
            レセコンから必要部分だけ貼り付けて、その場で印刷するための画面です。
            患者情報はブラウザ保存しません。薬局の既定値だけこの端末に残します。
          </p>
          <p className="printer-copy">
            このPCの `move CL-E300-LFX` に合わせて、初期値は `80 x 115 mm` にしています。
          </p>
          <div className="safety-note">
            <strong>このアプリは患者情報を保存しません。</strong>
            <span>入力した内容はその場の画面表示と印刷にだけ使います。</span>
            <span>使い終わったら画面を閉じてください。</span>
          </div>
        </div>
        <div className="intro-actions">
          <button type="button" className="primary" onClick={() => window.print()}>
            印刷する
          </button>
          <button type="button" className="secondary" onClick={clearPatientFields}>
            入力を消す
          </button>
        </div>
      </section>

      <section className="workspace">
        <div className="panel-stack no-print">
          <section className="panel">
            <div className="panel-header">
              <h2>1. まとめ貼り付け</h2>
              <p>1行タブ区切り、または改行3行で貼り付けできます。</p>
            </div>
            <textarea
              className="quick-paste"
              value={quickPaste}
              onChange={(event) => setQuickPaste(event.target.value)}
              placeholder={'例1: 山田太郎\t1980/04/01\t090-1234-5678\n例2:\n山田太郎\n1980/04/01\n090-1234-5678'}
            />
            <button type="button" className="secondary" onClick={applyQuickPaste}>
              貼り付け内容を反映
            </button>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>2. 患者ごと入力</h2>
              <p>この内容はページを閉じると消えます。</p>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>氏名</span>
                <input
                  value={patient.name}
                  onChange={(event) => updatePatient('name', event.target.value)}
                  placeholder="山田 太郎"
                />
              </label>

              <label className="field">
                <span>生年月日</span>
                <input
                  value={patient.birthDate}
                  onChange={(event) => updatePatient('birthDate', event.target.value)}
                  placeholder="1980年04月01日"
                />
              </label>

              <label className="field field-wide">
                <span>住所</span>
                <input
                  value={patient.address}
                  onChange={(event) => updatePatient('address', event.target.value)}
                  placeholder="東京都〇〇区..."
                />
              </label>

              <label className="field field-wide">
                <span>連絡先</span>
                <input
                  value={patient.contact}
                  onChange={(event) => updatePatient('contact', event.target.value)}
                  placeholder="090-1234-5678"
                />
              </label>

              <label className="field field-wide">
                <span>② アレルギー歴・副作用歴等</span>
                <textarea
                  value={patient.allergyNotes}
                  onChange={(event) =>
                    updatePatient('allergyNotes', event.target.value)
                  }
                  placeholder="空欄のまま印刷して、手書きでも使えます"
                />
              </label>

              <label className="field field-wide">
                <span>③ 主な既往歴等</span>
                <textarea
                  value={patient.historyNotes}
                  onChange={(event) => updatePatient('historyNotes', event.target.value)}
                  placeholder="空欄のまま印刷して、手書きでも使えます"
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>3. 既定値設定</h2>
              <p>薬局情報だけこの端末に保存します。レスプリ向けサイズもここで調整します。</p>
            </div>

            <div className="field-grid">
              <label className="field field-wide">
                <span>プリンタープリセット</span>
                <select
                  value={settings.printerPreset}
                  onChange={(event) =>
                    applyPrinterPreset(
                      event.target.value as keyof typeof PRINTER_PRESETS,
                    )
                  }
                >
                  {Object.entries(PRINTER_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field-wide">
                <span>利用薬局名</span>
                <input
                  value={settings.pharmacyName}
                  onChange={(event) =>
                    updateSettings('pharmacyName', event.target.value)
                  }
                  placeholder="〇〇薬局"
                />
              </label>

              <label className="field">
                <span>薬局電話番号</span>
                <input
                  value={settings.pharmacyPhone}
                  onChange={(event) =>
                    updateSettings('pharmacyPhone', event.target.value)
                  }
                  placeholder="03-1234-5678"
                />
              </label>

              <label className="field">
                <span>薬剤師氏名</span>
                <input
                  value={settings.pharmacistName}
                  onChange={(event) =>
                    updateSettings('pharmacistName', event.target.value)
                  }
                  placeholder="薬剤師 花子"
                />
              </label>

              <label className="field">
                <span>表示文字</span>
                <input
                  value={settings.kakaritsukeLabel}
                  onChange={(event) =>
                    updateSettings('kakaritsukeLabel', event.target.value)
                  }
                  placeholder="かかりつけ"
                />
              </label>

              <label className="field">
                <span>印刷幅 mm</span>
                <input
                  inputMode="decimal"
                  value={settings.printWidthMm}
                  onChange={(event) =>
                    updateSettings('printWidthMm', event.target.value)
                  }
                  placeholder="105"
                />
              </label>

              <label className="field">
                <span>印刷高さ mm</span>
                <input
                  inputMode="decimal"
                  value={settings.printHeightMm}
                  onChange={(event) =>
                    updateSettings('printHeightMm', event.target.value)
                  }
                  placeholder="148"
                />
              </label>

              <label className="field">
                <span>内側余白 mm</span>
                <input
                  inputMode="decimal"
                  value={settings.printPaddingMm}
                  onChange={(event) =>
                    updateSettings('printPaddingMm', event.target.value)
                  }
                  placeholder="8"
                />
              </label>
            </div>
          </section>
        </div>

        <section className="preview-pane">
          <div className="preview-header no-print">
            <div>
              <p className="eyebrow">印刷プレビュー</p>
              <h2>レスプリに合わせて微調整</h2>
            </div>
            <p className="preview-note">
              用紙サイズは設定値をそのまま反映します。プリンタ側の用紙設定も同じ寸法に合わせてください。
            </p>
          </div>

          <div className="print-help no-print">
            <strong>印刷時のおすすめ</strong>
            <span>印刷先は `move CL-E300-LFX` を選択</span>
            <span>用紙は `80 x 115 mm` 相当を選択</span>
            <span>ブラウザの余白は `なし` または最小</span>
            <span>倍率は `100%` を基本に、ずれる時だけ mm を微調整</span>
          </div>

          <div className="sheet-stage" style={printStyle}>
            <article className="sheet">
              <header className="sheet-header">
                <div className="sheet-header-band">
                  <p className="sheet-title">かかりつけ薬剤師・お薬手帳 記載欄</p>
                </div>
              </header>

              <section className="sheet-section">
                <h3>① 患者情報</h3>
                <div className="sheet-grid">
                  <div className="sheet-item">
                    <span>氏名</span>
                    <strong>{patient.name || '　　　　　　　　　'}</strong>
                  </div>
                  <div className="sheet-item">
                    <span>生年月日</span>
                    <strong>{patient.birthDate || '　　　　　　　　　'}</strong>
                  </div>
                  <div className="sheet-item sheet-item-wide">
                    <span>住所</span>
                    <strong>{patient.address || '　　　　　　　　　　　　　　　　'}</strong>
                  </div>
                  <div className="sheet-item sheet-item-wide">
                    <span>連絡先</span>
                    <strong>{patient.contact || '　　　　　　　　　　　　　　　　'}</strong>
                  </div>
                </div>
              </section>

              <section className="sheet-section">
                <h3>② アレルギー歴・副作用歴等</h3>
                <div className="handwrite-box">
                  {patient.allergyNotes || <span className="line-guide" />}
                </div>
              </section>

              <section className="sheet-section">
                <h3>③ 主な既往歴等</h3>
                <div className="handwrite-box">
                  {patient.historyNotes || <span className="line-guide" />}
                </div>
              </section>

              <div className="cut-line" aria-hidden="true">
                <span>切り取り</span>
              </div>

              <section className="sheet-section">
                <h3>④ 利用薬局・薬剤師</h3>
                <div className="sheet-grid">
                  <div className="sheet-item sheet-item-wide">
                    <span>利用薬局名</span>
                    <strong>{settings.pharmacyName || '　　　　　　　　　　　　　　　　'}</strong>
                  </div>
                  <div className="sheet-item">
                    <span>薬局電話番号</span>
                    <strong>{settings.pharmacyPhone || '　　　　　　　　　'}</strong>
                  </div>
                  <div className="sheet-item">
                    <span>薬剤師氏名</span>
                    <div className="pharmacist-line">
                      <strong>{settings.pharmacistName || '　　　　　　　　'}</strong>
                      <em className="kakaritsuke-inline">
                        {settings.kakaritsukeLabel.trim() || 'かかりつけ'}
                      </em>
                    </div>
                  </div>
                </div>
              </section>

              <footer className="sheet-footer">
                <span>印刷日: {new Date().toLocaleDateString('ja-JP')}</span>
              </footer>
            </article>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
