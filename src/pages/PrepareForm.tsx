import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SERVICES, getServiceBySlug } from "@/data/services";
import TopBar from "@/components/landing/TopBar";
import StickyNav from "@/components/landing/StickyNav";
import Footer from "@/components/landing/Footer";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toast } from "sonner";

const nameKeys: Record<string, string> = {
  "disability-support": "service.dsp",
  "medicare": "service.medicare",
  "ndis-access": "service.ndis",
  "aged-care": "service.agedCare",
  "carer-payment": "service.carer",
  "age-pension": "service.agePension",
};

const officialFormLinks: Record<string, { type: "url" | "phone"; value: string }> = {
  "disability-support": { type: "url", value: "https://www.servicesaustralia.gov.au/sites/default/files/sa466en.pdf" },
  "age-pension": { type: "url", value: "https://www.servicesaustralia.gov.au/sites/default/files/sa002en.pdf" },
  "carer-payment": { type: "url", value: "https://www.servicesaustralia.gov.au/sites/default/files/sc001en.pdf" },
  "medicare": { type: "url", value: "https://www.servicesaustralia.gov.au/sites/default/files/ms004en.pdf" },
  "ndis-access": { type: "url", value: "https://www.ndis.gov.au/applying-access-ndis/how-apply" },
  "aged-care": { type: "phone", value: "1800 200 422" },
};

const docsToAttach: Record<string, string[]> = {
  "disability-support": ["Medical certificate or report from your doctor", "Proof of identity (passport, birth certificate or driver licence)", "Medicare card"],
  "medicare": ["Passport", "Visa grant letter", "Proof of address in Australia"],
  "ndis-access": ["Supporting evidence from a doctor or specialist", "Proof of identity", "Proof of Australian residency"],
  "aged-care": ["Proof of identity", "Medicare card", "Doctor's referral or letter of support"],
  "carer-payment": ["Medical certificate for the person you care for", "Proof of identity for you and the care receiver", "Medicare card"],
  "age-pension": ["Proof of identity (passport or birth certificate)", "Proof of Australian residence for 10+ years", "Bank account details", "Medicare card"],
};

const centrelinkAddress = "Services Australia\nReply Paid 7800\nCanberra BC ACT 2610";

const PrepareForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const preselected = searchParams.get("service") || "";

  const [selectedService, setSelectedService] = useState(preselected);
  const [step, setStep] = useState<"select" | "upload" | "confirm" | "done">(preselected ? "upload" : "select");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [medicareFile, setMedicareFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  const service = getServiceBySlug(selectedService);
  const serviceName = service ? t(nameKeys[selectedService] || service.name) : "";

  const handleSelectService = (slug: string) => {
    setSelectedService(slug);
    setStep("upload");
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob.trim() || !address.trim() || !phone.trim()) return;
    setStep("confirm");
  };

  const generatePDF = async (e: React.MouseEvent) => {
    e.preventDefault();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const today = new Date().toLocaleDateString("en-AU");
    const docs = docsToAttach[selectedService] || [];
    let y = 780;
    const draw = (text: string, x: number, f = font, size = 11) => {
      page.drawText(text, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 8;
    };

    draw("Your Application Checklist", 50, bold, 20);
    draw("Prepared by Luma — Northern Community Care SA Inc", 50, font, 10);
    y -= 10;
    page.drawLine({ start: { x: 50, y: y + 5 }, end: { x: 545, y: y + 5 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 15;

    draw(`Date:  ${today}`, 50, font, 11);
    draw(`Full Name:  ${name}`, 50, font, 11);
    draw(`Date of Birth:  ${dob}`, 50, font, 11);
    draw(`Address:  ${address}`, 50, font, 11);
    draw(`Phone:  ${phone}`, 50, font, 11);
    draw(`Form Type:  ${serviceName}`, 50, font, 11);
    draw(`Medicare Card:  ${medicareFile ? "Provided" : "Not provided"}`, 50, font, 11);
    draw(`ID Document:  ${idFile ? "Provided" : "Not provided"}`, 50, font, 11);
    y -= 10;

    draw("Documents to attach:", 50, bold, 12);
    docs.forEach((d) => draw(`  •  ${d}`, 55));
    y -= 10;

    draw("Post your completed form to:", 50, bold, 12);
    centrelinkAddress.split("\n").forEach((line) => draw(line, 55));
    y -= 20;

    draw("This checklist was generated by Luma at NCCSA.", 50, font, 9);
    draw("Your data is processed locally and never stored on our servers.", 50, font, 9);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NCCSA-checklist-${selectedService}-${today}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setStep("done");
  };

  const copyPhone = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText("1800200422");
    toast.success(t("prepare.phoneCopied"));
  };

  const officialLink = officialFormLinks[selectedService];

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <TopBar />
      <StickyNav />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <button onClick={(e) => { e.preventDefault(); navigate("/"); }} className="mb-6 text-sm font-semibold text-primary hover:underline">
          {t("service.back")}
        </button>

        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-extrabold text-foreground">{t("prepare.title")}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t("prepare.desc")}</p>
        </div>

        {step === "select" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 mb-4">
              <LumaAvatar size={32} />
              <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground">{t("prepare.whichForm")}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SERVICES.map((s) => (
                <button key={s.slug} onClick={(e) => { e.preventDefault(); handleSelectService(s.slug); }} className="card-hover relative rounded-[14px] border border-border bg-card p-4 text-left transition-all hover:border-primary">
                  <span className="text-2xl">{s.icon}</span>
                  <div className="mt-1 font-serif text-sm font-bold text-foreground">{t(nameKeys[s.slug] || s.name)}</div>
                  <div className="mt-1 text-xs font-semibold text-primary">{t("prepare.select")}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "upload" && service && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <LumaAvatar size={32} />
              <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground">
                {t("prepare.desc")} — <strong>{serviceName}</strong>
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">{t("prepare.fullName")}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("prepare.enterName")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">{t("prepare.dob")}</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">{t("prepare.address")}</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("prepare.enterAddress")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">{t("prepare.phone")}</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("prepare.enterPhone")} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">{t("prepare.medicareCard")}</label>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setMedicareFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-bold file:text-primary-foreground" />
                {medicareFile && <p className="mt-1 text-xs text-primary">✓ {medicareFile.name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-foreground">{t("prepare.idDoc")}</label>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setIdFile(e.target.files?.[0] || null)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-bold file:text-primary-foreground" />
                {idFile && <p className="mt-1 text-xs text-primary">✓ {idFile.name}</p>}
              </div>
              <button onClick={handleConfirm} disabled={!name.trim() || !dob.trim() || !address.trim() || !phone.trim()} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50">{t("prepare.continue")}</button>
            </div>
          </div>
        )}

        {step === "confirm" && service && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <LumaAvatar size={32} />
              <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground">{t("prepare.gotDetails")}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("prepare.name")}</span><span className="font-bold text-foreground">{name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("prepare.dob")}</span><span className="font-bold text-foreground">{dob}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("prepare.address")}</span><span className="font-bold text-foreground">{address}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("prepare.phone")}</span><span className="font-bold text-foreground">{phone}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("prepare.form")}</span><span className="font-bold text-foreground">{serviceName}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("prepare.medicareCard")}</span><span className="font-bold text-primary">{medicareFile ? t("prepare.uploaded") : t("prepare.notProvided")}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("prepare.idDoc")}</span><span className="font-bold text-primary">{idFile ? t("prepare.uploaded") : t("prepare.notProvided")}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("prepare.date")}</span><span className="font-bold text-foreground">{new Date().toLocaleDateString("en-AU")}</span></div>
            </div>

            {/* Download summary PDF */}
            <button onClick={generatePDF} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90">
              📄 {t("prepare.downloadSummary")}
            </button>

            {/* Download official form */}
            {officialLink && officialLink.type === "url" && (
              <a href={officialLink.value} target="_blank" rel="noopener noreferrer" className="block w-full rounded-xl border-2 border-primary bg-card py-3 text-center text-sm font-bold text-primary transition-all hover:bg-primary/10">
                📥 {t("prepare.downloadOfficial")}
              </a>
            )}
            {officialLink && officialLink.type === "phone" && (
              <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-2">
                <p className="text-sm text-foreground">{t("prepare.agedCareCall")}</p>
                <p className="text-xl font-bold text-primary">{officialLink.value}</p>
                <button onClick={copyPhone} className="rounded-xl border border-primary bg-card px-5 py-2 text-sm font-bold text-primary hover:bg-primary/10 transition-colors">
                  📋 {t("prepare.copyNumber")}
                </button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">{t("prepare.docsLocal")}</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <div className="flex items-start gap-3 justify-center">
              <LumaAvatar size={32} />
              <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground">{t("prepare.done")}</div>
            </div>
            <button onClick={(e) => { e.preventDefault(); navigate("/"); }} className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-bold text-foreground hover:bg-muted transition-colors">{t("prepare.backHome")}</button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PrepareForm;
