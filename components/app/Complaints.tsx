'use client';
import { useState } from 'react';
import { FileSignature, Send, AlertTriangle, CheckCircle, RefreshCcw, Download } from 'lucide-react';

export default function Complaints() {
  const [step, setStep] = useState(1);
  const [issue, setIssue] = useState('');
  const [details, setDetails] = useState('');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setGeneratedTemplate(`[Date: ${new Date().toLocaleDateString()}]

To: [Name of Authority / Employer / Landlord]
Address: [Their Address]

From: [Your Name]
Address: [Your Address]
Phone: [Your Phone Number]

SUBJECT: FORMAL COMPLAINT REGARDING ${issue.toUpperCase() || 'ISSUE'}

Dear Sir/Madam,

I am writing this letter to formally lodge a complaint regarding the following issue: 
${details || 'I have been facing difficulties regarding our agreement and my rights.'}

According to Rwandan law, specifically [Relevant Law will be cited here by AI], I have the right to fair treatment in this matter. 

I kindly request that you look into this issue and provide a resolution by [Date, e.g., 14 days from now]. If this matter is not resolved by then, I may have to escalate this to the appropriate legal authorities or institutions (e.g., RIB, Ministry of Public Service and Labour).

I have attached relevant documents as evidence.

Sincerely,

_______________________
[Your Signature]
[Your Printed Name]`);
      setIsGenerating(false);
      setStep(2);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <FileSignature className="text-emerald-600" size={32} />
            Complaint Generator
          </h1>
          <p className="text-slate-500 text-lg">
            Create professional legal complaints tailored to your specific situation based on Rwandan law.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {step === 1 ? (
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Describe your issue</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    What is the main subject of your complaint?
                  </label>
                  <select 
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select a category...</option>
                    <option value="unpaid wages">Unpaid Wages</option>
                    <option value="unfair dismissal">Unfair Dismissal</option>
                    <option value="illegal eviction">Illegal Eviction</option>
                    <option value="breach of contract">Breach of Contract</option>
                    <option value="noise pollution">Noise Pollution</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Please provide details about what happened
                  </label>
                  <textarea 
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="E.g., My employer has not paid me for the last two months despite multiple requests..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[150px] resize-y"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
                  <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                  <p className="text-sm">
                    <strong>Disclaimer:</strong> This tool generates a template based on standard practices. It does not constitute binding legal advice. You are responsible for reviewing and editing the final document before submission.
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !issue || !details}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCcw className="animate-spin" size={20} />
                      Drafting Complaint...
                    </>
                  ) : (
                    <>
                      <FileSignature size={20} />
                      Generate Official Draft
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Your Draft is Ready</h2>
                    <p className="text-sm text-slate-500">Review and edit the fields in brackets before sending.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setStep(1)}
                  className="text-sm text-emerald-600 font-medium hover:underline"
                >
                  Start Over
                </button>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl mb-6">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
                  {generatedTemplate}
                </pre>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                  <Download size={18} />
                  Download PDF
                </button>
                <button className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                  <Send size={18} />
                  Send to Email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
