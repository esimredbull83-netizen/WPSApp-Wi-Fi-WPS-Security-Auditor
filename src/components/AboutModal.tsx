import React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Language } from '../types/network';

interface AboutModalProps {
  language: Language;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ language, onClose }) => {
  const isBn = language === 'bn';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1B3B6F]" />
            <h2 className="text-base font-bold text-slate-900">
              {isBn ? 'অ্যাপ ও নিরাপত্তা নির্দেশিকা' : 'About & Security Lab Notice'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
          {isBn ? (
            <>
              <p>
                এই ওয়েব অ্যাপটি Wi-Fi এবং WPS নিরাপত্তা অডিটিংয়ের একটি ইন্টারেক্টিভ ল্যাব ও
                সিমুলেটর। ব্রাউজার স্যান্ডবক্স নিরাপত্তার কারণে এটি সরাসরি ফোনের হার্ডওয়্যার
                ওয়াই-ফাই চিপ অ্যাক্সেস করে না।
              </p>
              <p>
                তবে এতে থাকা <strong>WPS চেকসাম ক্যালকুলেটর</strong>,{' '}
                <strong>Arcadyan</strong>, <strong>Belkin</strong> এবং{' '}
                <strong>ComputePIN</strong> অ্যালগরিদমগুলো প্রকৃত MAC-ভিত্তিক গাণিতিক সূত্র
                অনুযায়ী কাজ করে। আপনার নিজের রাউটারের MAC অ্যাড্রেস দিয়ে যাচাই করতে মেনু থেকে{' '}
                <em>&ldquo;কাস্টম AP / MAC যোগ করুন&rdquo;</em> ব্যবহার করুন।
              </p>
              <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
                নিরাপত্তা পরামর্শ: সর্বদা নিজের অনুমোদিত নেটওয়ার্কে অডিট করুন এবং সুরক্ষার জন্য
                রাউটারের সেটিংস থেকে WPS অপশন বন্ধ রাখুন।
              </p>
            </>
          ) : (
            <>
              <p>
                This application is an interactive Wi-Fi &amp; WPS security auditing
                workbench. Because web browsers restrict raw 802.11 radio frame injection,
                wireless scans and EAPOL M1–M8 / Pixie Dust handshakes run in a local
                educational simulation environment.
              </p>
              <p>
                The built-in <strong>WPS 8th-digit checksum validator</strong>,{' '}
                <strong>Arcadyan</strong>, <strong>Belkin</strong>, and{' '}
                <strong>ComputePIN</strong> calculators execute real MAC-to-PIN mathematical
                derivations. You can test any router MAC using{' '}
                <em>Add Custom AP / MAC</em> in the top menu.
              </p>
              <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
                Authorized use only: Audit only networks you own or have explicit permission
                to test. Disable WPS PIN authentication in router settings for maximum
                security.
              </p>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-[#1B3B6F] hover:bg-[#152E58] text-white rounded-lg cursor-pointer"
          >
            {isBn ? 'বুঝেছি' : 'Got It'}
          </button>
        </div>
      </div>
    </div>
  );
};
