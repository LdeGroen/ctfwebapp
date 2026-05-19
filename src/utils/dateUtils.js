// ========= Robuustere datum-parsering om sorteerfouten te voorkomen =========
export const parseDateForSorting = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return new Date(NaN);

  const trimmedDateString = dateString.trim();

  // Check expliciet op ISO formaat (yyyy-mm-dd) om verwarring te voorkomen
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDateString)) {
      return new Date(trimmedDateString);
  }

  // Prioriteer 'dd-mm-yyyy' formaat door het om te zetten naar 'yyyy-mm-dd'
  // Dit formaat wordt eenduidig geïnterpreteerd door `new Date()`
  const dmyParts = trimmedDateString.split('-');
  if (dmyParts.length === 3) {
      const [d, m, y] = dmyParts;
      if (!isNaN(parseInt(d, 10)) && !isNaN(parseInt(m, 10)) && !isNaN(parseInt(y, 10))) {
          const isoFormattedString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const date = new Date(isoFormattedString);
          if (!isNaN(date.getTime())) {
              return date;
          }
      }
  }

  // Verwerk 'dd maandnaam yyyy' formaat
  const monthNames = {
    'januari': '01', 'jan': '01', 'februari': '02', 'feb': '02', 'maart': '03', 'mrt': '03',
    'april': '04', 'apr': '04', 'mei': '05', 'juni': '06', 'jun': '06', 'juli': '07', 'jul': '07',
    'augustus': '08', 'aug': '08', 'september': '09', 'sep': '09', 'oktober': '10', 'okt': '10',
    'november': '11', 'nov': '11', 'december': '12', 'dec': '12'
  };

  const textParts = trimmedDateString.split(' ');
  if (textParts.length === 3 && textParts[1]) {
    const day = textParts[0];
    const monthNum = monthNames[textParts[1].toLowerCase()];
    const year = textParts[2];
    if (day && monthNum && year) {
        const isoFormattedString = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
        const date = new Date(isoFormattedString);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
  }

  // Fallback voor andere formaten die Date.parse mogelijk begrijpt
  const fallbackDate = new Date(trimmedDateString);
  if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
  }

  return new Date(NaN);
};
