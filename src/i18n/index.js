import en from './en';
import sv from './sv';

const translations = {
  en,
  sv,
};

// returns a translator function for the selected language
export default function getTranslation(lang = 'en') {
  const dict = translations[lang] || translations.en;
  return function t(key) {
    return key.split('.').reduce((acc, k) => acc && acc[k], dict) || key;
  };
}
