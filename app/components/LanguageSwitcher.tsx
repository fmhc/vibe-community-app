import { useTranslation } from "react-i18next";
import { Form } from "@remix-run/react";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return (
    <div className="relative">
      <Form method="post" action="/change-language" className="inline-block">
        <select
          name="language"
          value={currentLanguage}
          onChange={(e) => {
            const form = e.target.closest('form') as HTMLFormElement;
            form.submit();
          }}
          className="bg-vaporwave-card border border-vaporwave-cyan/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50 cursor-pointer"
        >
          <option value="en">{t('language.english')}</option>
          <option value="de">{t('language.german')}</option>
        </select>
      </Form>
    </div>
  );
} 