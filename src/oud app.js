import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Client, Databases, Query, ID } from 'appwrite';
import ReactGA from 'react-ga4';

// ========= Appwrite Configuratie =========
const APPWRITE_CONFIG = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '6874f0b40015fc341b14',
    databaseId: '68873afd0015cc5075e5',
    collections: {
        companies: '68873b5f0032519e7321',
        performances: '68873b6500074288e73d',
        locations: '68878ee7000cb07ef9e7',
        executions: '68878f2d0020be3a7efd',
        events: '688798900022cbda4ec0',
        news: '68948a4b002d7cda6919',
        sponsors: '68948b97003e5aa5068c',
        info: '68945b4f000e7c3880cb',
        toegankelijkheid: '6894d367002bf2645148',
        marketing: '689ded8900383f2d618b',
        routes: 'route',
        reserveringen: 'reserveringen'
    }
};


// ========= NIEUW: Decoratieve Figuren =========
const DECORATIVE_FIGURES = [
    'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/12/cafe-theater-festival-man-met-koffie-scaled.png',
    'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/12/cafe-theater-festival-breakdancer-scaled.png',
    'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/12/cafe-theater-festival-drag-queen-scaled.png',
    'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/12/cafe-theater-festival-viool-speelster-scaled.png'
];

// Helper om willekeurige figuren te kiezen op basis van een seed (zodat het stabiel blijft per pagina) of random
const getRandomFigures = (seedString) => {
    let seed = 0;
    if (seedString) {
        for (let i = 0; i < seedString.length; i++) {
            seed = ((seed << 5) - seed) + seedString.charCodeAt(i);
            seed |= 0;
        }
    } else {
        seed = Math.floor(Math.random() * 10000);
    }
    
    // Kies index 1
    const index1 = Math.abs(seed) % DECORATIVE_FIGURES.length;
    // Kies index 2 (zorg dat het niet dezelfde is als index 1)
    let index2 = Math.abs(seed >> 1) % DECORATIVE_FIGURES.length;
    if (index1 === index2) {
        index2 = (index2 + 1) % DECORATIVE_FIGURES.length;
    }
    
    return [DECORATIVE_FIGURES[index1], DECORATIVE_FIGURES[index2]];
};

// ========= Functie om een URL-vriendelijke slug te maken =========
const slugify = (text) => {
    if (!text) return '';
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error: error, errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'black', backgroundColor: 'white', height: '100vh' }}>
          <h1>Oeps, er is iets misgegaan.</h1>
          <p>Probeer de app opnieuw te laden.</p>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}


// ========= Robuustere datum-parsering om sorteerfouten te voorkomen =========
const parseDateForSorting = (dateString) => {
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


const translations = {
  nl: {
    common: {
      timetable: 'Timetable',
      blockTimetable: 'Blokkenschema',
      favorites: 'Favorieten',
      searchPlaceholder: 'Zoek op artiest, titel of locatie...',
      loading: 'Timetable wordt ingeladen...',
      errorOops: 'Oeps, er ging iets mis!',
      errorLoading: 'Fout bij het laden van de dienstregeling. Probeer het later opnieuw of controleer de URL/sheet-structuur.',
      errorTimeout: 'De verbinding duurde te lang. Controleer je internetverbinding en probeer het opnieuw.',
      offlineIndicator: 'Offline modus: de getoonde gegevens zijn mogelijk verouderd.',
      tryAgain: 'Opnieuw proberen',
      noFavoritesFound: 'Geen favoriete voorstellingen gevonden.',
      noSearchResults: 'Geen resultaten gevonden voor \'%s\'.',
      noDataFound: 'Geen voorstellingen gevonden voor %s.',
      noFilterResultsForEvent: 'Er zijn geen voorstellingen in dit event die voldoen aan deze filters.',
      moreInfo: 'Meer info',
      news: 'Nieuws',
      addToFavorites: 'Voeg toe aan favorieten (ontvang herinnering)',
      removeFromFavorites: 'Verwijder van favorieten (annuleer herinnering)',
      addToGoogleCalendar: 'Voeg toe aan Google Agenda',
      sharePerformance: 'Deel voorstelling',
      close: 'Sluit pop-up',
      privacyPolicy: 'Privacybeleid',
      becomeRegularGuest: 'Word stamgast!',
      becomeStamgastButton: 'WORD STAMGAST!',
      becomeRegularGuestShort: 'Stamgast',
      forEvent: 'voor %s',
      onThisDay: 'op deze dag',
      noContentAvailable: 'Geen inhoud beschikbaar voor deze pop-up.',
      'openLocationInGoogleMaps': 'Open locatie in Google Maps',
      wheelchairAccessible: 'Rolstoeltoegankelijk',
      suitableForChildren: 'Geschikt voor kinderen',
      dutchLanguage: 'Nederlandse taal',
      englishLanguage: 'Engelse taal',
      dialogueFree: 'Dialogue Free',
      diningFacility: 'Eetgelegenheid',
      tooltipWheelchair: 'Deze locatie is rolstoeltoegankelijk en heeft een invalidentoilet',
      tooltipChildren: 'Deze voorstelling is geschikt voor kinderen vanaf 8 jaar',
      tooltipDutch: 'Deze voorstelling bevat Nederlandse tekst',
      tooltipEnglish: 'Deze voorstelling bevat Engelse tekst',
      tooltipDialogueFree: 'In deze voorstelling zit geen gesproken tekst',
      tooltipDining: 'Je kunt op deze locatie eten',
      tooltipNGT: 'Bij deze voorstelling is een Tolk Nederlandse Gebarentaal aanwezig',
      notificationTitle: 'Herinnering: Voorstelling begint bijna!',
      notificationBody: '%s in %s begint over 20 minuten.',
      genericNotificationTitle: 'Café Theater Festival',
      crowdLevel: 'Verwachte drukte:',
      genre: 'Genre',
      location: 'Locatie',
      tooltipCrowdLevelGreenFull: 'De verwachtte drukte bij deze voorstelling is normaal. Als je op tijd komt kun je waarschijnlijk een zitplekje vinden!',
      tooltipCrowdLevelOrangeFull: 'De verwachtte drukte bij deze voorstelling is druk. We verwachten dat een deel van het publiek moet staan bij deze voorstelling om het goed te kunnen zien!',
      tooltipCrowdLevelRedFull: 'De verwachtte drukte bij deze voorstelling is erg druk. Kom op tijd, want het zou zo maar kunnen dat deze voorstelling vol raakt.',
      tooltipCrowdLevelFull: 'Deze voorstelling is vol! Je kunt nog wel naar een van de andere voorstellingen gaan.',
      shareSuccess: 'Link gekopieerd naar klembord!',
      shareError: 'Delen mislukt.',
      shareBody: 'Bekijk deze voorstelling: %s op het Café Theater Festival!',
      exactAlarmPermissionNeededTitle: 'Notificaties instellen',
      exactAlarmPermissionNeededBody: 'Voor betrouwbare herinneringen heeft de app de permissie "Wekkers en herinneringen" nodig. Schakel deze in voor de beste ervaring.',
      openSettings: 'Instellingen',
      mapTitle: 'Kaart %s',
      allPerformances: 'Alle voorstellingen',
      calmRoute: 'Rustige route',
      reserve: 'Reserveren',
      reservationTitle: 'Reserveren voor %s',
      reservationName: 'Naam',
      reservationEmail: 'E-mailadres',
      reservationPhone: 'Telefoonnummer',
      reservationAmount: 'Aantal plekken',
      reservationSubmit: 'Reserveer nu',
      reservationSuccess: 'Bedankt voor je reservering!',
      reservationCapacity: 'Beschikbare plekken: %s',
      reservationError: 'Er ging iets mis bij het reserveren. Probeer het opnieuw.',
      utrechtCentraal: 'Utrecht Centraal', // NIEUW
      proudMainSponsor: 'Is trotse hoofdsponsor van %s',
      chooseCity: 'Kies stad',
      cardView: 'Voorstellingen', 
      geannuleerd: 'Geannuleerd',
      vol: 'Vol',
      tooltipCrowdLevelCancelled: 'Deze voorstelling is helaas geannuleerd.',
      cancellationNotificationTitle: 'Voorstelling Geannuleerd',
      cancellationNotificationBody: 'Let op: %s is geannuleerd. Kijk in de app voor een alternatief!',
      fullNotificationTitle: 'Voorstelling Vol',
      fullNotificationBody: 'Helaas, de voorstelling %s is vol. Kijk in de app voor een andere voorstelling!',
      dontAskAgain: 'Niet meer vragen',
      later: 'Later',
      exportFavorites: 'Exporteer Favorieten',
      exportFavoritesTitle: 'Exporteer je favorieten',
      exporting: 'Exporteren...',
      exportError: 'Fout bij exporteren. Probeer het opnieuw.',
      shareFavorites: 'Deel mijn CTF Favorieten!',
      shareAsImage: 'Afbeelding',
      shareAsLink: 'Deel als link',
      shareLinkTitle: 'Mijn CTF Favorieten',
      shareLinkBody: 'Hoi! Dit zijn mijn favoriete voorstellingen voor het Café Theater Festival. Open de link om ze te bekijken en te importeren in je eigen timetable app!',
      importFavorites: 'Importeer Favorieten',
      import: 'Importeer',
      cancel: 'Annuleren',
      favoritesFromFriend: 'Favorieten van een vriend',
      importSuccess: 'Favorieten van vriend succesvol geïmporteerd!',
      friendsFavorites: 'Favorieten van Vrienden',
      noFriendsFavoritesFound: 'Geen favorieten van vrienden gevonden.',
      removeFriendsFavorites: 'Verwijder favorieten van vrienden',
      filterByIcon: 'Filter op icoon...',
      filterScopeAllEvents: 'Alle events',
      filterScopeThisEvent: 'Dit event',
      filterByGenre: 'Filter op genre...',
      filterScopeLabel: 'Filter toepassen',
      readPage: 'Lees pagina voor',
      readPerformance: 'Lees voorstelling voor',
      readPopup: 'Lees pop-up voor',
      accessibility: 'Toegankelijkheid',
      grayscale: 'Grijstinten',
      highContrast: 'Hoog contrast',
      negativeContrast: 'Negatief contrast',
      underlineLinks: 'Onderstreep links',
      readableFont: 'Leesbaar lettertype',
      resetAccessibility: 'Reset',
      general: 'Algemeen',
      footerText: 'Het Café Theater Festival wordt mede mogelijk gemaakt door haar partners en begunstigers:',
      footerIntroText: 'Het CTF vermengt podiumkunsten en de horeca tot een plek waar niets is wat het lijkt. Naast de jaarlijkse festivals in Utrecht, Arnhem en Rotterdam organiseert het CTF kleinere events door het jaar heen.',
      back: 'Terug',
      performanceSchedule: 'Speeltijden',
      // START WIJZIGING
      aboutCreators: 'Over de makers',
      aboutShow: 'Over de voorstelling',
      // EINDE WIJZIGING
      routes: 'Routes',
      chooseRoute: 'Kies een route',
      addRouteToFavorites: 'Voeg hele route toe aan favorieten',
      removeRouteFromFavorites: 'Verwijder route uit favorieten',
      routeAdded: 'Route toegevoegd aan favorieten!',
      routeRemoved: 'Route verwijderd uit favorieten.',
      chooseDate: 'Kies een datum',
      helpChoosing: 'Hulp nodig met kiezen?',
      chooseEvent: 'Naar welk festival kom je?',
      seeSomethingElse: 'Nog iets zien?',
      similarShow: 'Iets wat hierop lijkt',
      differentShow: 'Iets totaal anders',
      nearbyShow: 'Iets in de buurt',
      advertisement: 'Advertentie',
      howPWYCWorks: 'Hoe werkt Pay What You Can?',
    },
    appDownload: {
      title: 'Download de CTF app!',
      popupTitle: 'Download nu de CTF app!',
      playStoreAlt: 'Download in de Google Play Store',
      appStoreAlt: 'Download in de Apple App Store',
    },
    cookiePopup: {
      title: 'Wij gebruiken cookies',
      text: 'Deze website gebruikt cookies om uw ervaring te verbeteren, de prestaties te analyseren en marketing te personaliseren. Door op "Alles accepteren" te klikken, gaat u akkoord met het gebruik van alle cookies. U kunt uw voorkeuren aanpassen door op "Alleen functioneel" te klikken of alle niet-essentiële cookies te weigeren met "Weigeren".',
      acceptAll: 'Alles accepteren',
      acceptFunctional: 'Alleen functioneel',
      decline: 'Weigeren'
    },
    genres: {
        'Muziektheater': 'Muziektheater', 'Dans': 'Dans', 'Theater': 'Theater',
        'Fysiek theater': 'Fysiek theater', 'Locatietheater': 'Locatietheater',
        'Komedie': 'Komedie', 'Drama': 'Drama', 'Storytelling': 'Storytelling', 'Mime': 'Mime',
        'Performance': 'Performance', 'Kindertheater': 'Kindertheater', 'Opera': 'Opera',
        'Cabaret': 'Cabaret', 'Monoloog': 'Monoloog', 'Interactief': 'Interactief',
        'Beeldend theater': 'Beeldend theater', 'Clownerie': 'Clownerie',
        'Absurdistisch': 'Absurdistisch', 'Circus': 'Circus', 
    },
    payWhatYouCan: {
      title: "Pay What You Can",
      text: `Bij het CTF hoef je nooit een kaartje te kopen of een plekje te reserveren! We vinden dat belangrijk omdat we in cafés spelen, en juist ook de mensen die niet voor de voorstelling komen willen uitnodigen te blijven zitten en de voorstelling mee te maken. Toch vragen we het publiek om ook financieel bij tedragen aan het festival en de makers. Dat doen we met ons Pay What You Can systeem.\n\nNa de voorstelling komen de makers langs om te vragen om een financiële bijdrage van €6,-, €8,-, of €10,- euro. We hanteren verschillende bedragen omdat we er willen zijn voor bezoekers met een kleine én een grote portemonnee. Je kunt bij het CTF altijd met PIN, of via een QR-code met Tikkie betalen.\n\nLet op: Als je de tikkie betaald geld dat dus niet als een reservering. Je kunt het beste op tijd naar de voorstelling komen en na de voorstelling een Pay What You Can donatie doen.`
    },
    crowdMeterInfo: {
      title: "Uitleg druktemeter",
      text: `Dit is onze druktemeter! Hier kun je van tevoren zien hoe druk we verwachten dat het bij een voorstelling wordt. We updaten deze druktemeter live, dus je kunt in je app zien als een voorstelling vol is.\n\n**Uitleg kleuren:**\n\n**Groen**= de verwachtte drukte bij deze voorstelling is normaal. Als je op tijd komt kun je waarschijnlijk een zitplekje vinden\n\n**Oranje**= De verwachtte drukte bij deze voorstelling is druk. We verwachten dat een deel van het publiek moet staan bij deze voorstelling om het goed te kunnen zien\n\n**Rood**= De verwachtte drukte bij deze voorstelling is erg druk. Kom op tijd, want het zou zo maar kunnen dat deze voorstelling vol raakt\n\n**Rode balk met kruis**= Deze voorstelling zit vol! Je kunt nog wel naar een van de andere voorstellingen gaan`
    },
    calmRouteInfo: {
      title: 'Rustige Route',
      text: `Niet iedereen houdt van een druk en vol café en daarom hebben we de Rustige Route in het leven geroepen. Per festival zijn er twee voorstellingen waarbij het mogelijk is om een plek te reserveren, waardoor je verzekerd bent van een plaats. Daarnaast zullen de gekozen voorstellingen ook rustiger zijn dan sommige andere voorstellingen op het festival.\n\nLet op: de voorstellingen in de rustige route zijn niet prikkel-arm. Vanwege het onvoorspelbare karakter van de caféruimte en het feit dat veel voorstellingen de hele ruimte gebruiken kunnen we bij geen enkel voorstelling een prikkel-arme omgeving garanderen.`,
      button: 'Reserveer een plekje'
    },
    privacyPolicyContent: `**Privacybeleid voor de Café Theater Festival webapp**\n\n*Laatst bijgewerkt: 7 september 2025*\n\nWelkom bij de Café Theater Festival webapp. Deze app is ontworpen om u te helpen de timetable van het festival te bekijken, voorstellingen als favoriet te markeren, herinneringen in te stellen en evenementen aan uw agenda toe te voegen.\n\nUw privacy is belangrijk voor ons. Dit privacybeleid beschrijft hoe wij informatie verzamelen, gebruiken en beschermen wanneer u onze app gebruikt.\n\n**1. Welke Informatie Verzamelen Wij?**\n\n- **Favoriete Voorstellingen**: Wanneer u een voorstelling als favoriet markeert, wordt deze informatie uitsluitend lokaal opgeslagen op uw apparaat in de lokale opslag van de browser (localStorage). Deze gegevens worden niet naar externe servers verzonden.\n\n- **Notificatietoestemming**: De app kan u om toestemming vragen om browsernotificaties te tonen voor herinneringen aan voorstellingen. Uw keuze wordt lokaal door uw browser beheerd.\n\n- **Analytische Gegevens (na toestemming)**: Als u toestemming geeft voor alle cookies, verzamelen we anonieme gebruiksgegevens via Google Analytics. Dit omvat informatie zoals welke pagina's worden bezocht en op welke knoppen wordt geklikt. Deze gegevens zijn anoniem, niet te herleiden tot u als individu en worden gebruikt om de app te verbeteren. We verzamelen geen IP-adressen.\n\n**2. Hoe Gebruiken Wij Uw Informatie?**\n\nDe lokaal opgeslagen informatie wordt alleen gebruikt om u een gepersonaliseerde ervaring binnen de app te bieden. Analytische gegevens helpen ons te begrijpen hoe de app wordt gebruikt, zodat we deze kunnen optimaliseren voor toekomstige edities van het festival.\n\n**3. Delen van Uw Informatie**\n\nWij delen uw lokaal opgeslagen informatie (zoals favorieten) met niemand. De anonieme analytische gegevens die worden verzameld na uw toestemming, worden verwerkt door Google. Voor meer informatie kunt u het [privacybeleid van Google](https://policies.google.com/privacy) raadplegen.\n\n**4. Cookies en Toestemming**\n\nDe app vraagt bij uw eerste bezoek om toestemming voor het gebruik van cookies.\n\n- **Functionele Cookies**: Strikt noodzakelijke cookies voor de werking van de app, zoals het onthouden van uw favorieten en taalvoorkeur.\n\n- **Analytische Cookies (Optioneel)**: Alleen na uw uitdrukkelijke toestemming ("Alles accepteren") plaatsen we cookies voor Google Analytics. U kunt de app volledig gebruiken zonder deze cookies te accepteren.\n\n**5. Externe Links**\n\nDeze app bevat links naar externe websites (bijv. Google Calendar). Wanneer u op deze links klikt, verlaat u onze app. Wij zijn niet verantwoordelijk voor het privacybeleid van andere websites.\n\n**6. Beveiliging**\n\nAangezien alle persoonlijke gegevens lokaal op uw apparaat worden opgeslagen, zijn de beveiligingsrisico's minimaal.\n\n**7. Wijzigingen in Dit Privacybeleid**\n\nWe kunnen dit privacybeleid van tijd tot tijd bijwerken. Wijzigingen zijn onmiddellijk van kracht nadat ze in de app zijn geplaatst.\n\n**8. Contact Met Ons Opnemen**\n\nAls u vragen heeft over dit privacybeleid, kunt u contact met ons opnemen via: Info@cafetheaterfestival.nl`,
    appPrivacyPolicy: {
        title: 'Privacybeleid voor de Café Theater Festival Timetable App',
        content: `Laatst bijgewerkt: 30 juni 2025\n\nWelkom bij de Café Theater Festival Timetable App. Deze app is ontworpen om u te helpen de timetable van het festival te bekijken, voorstellingen als favoriet te markeren, herinneringen in te stellen en evenementen aan uw agenda toe te voegen.\n\nUw privacy is belangrijk voor ons. Dit privacybeleid beschrijft hoe wij informatie verzamelen, gebruiken en beschermen wanneer u onze app gebruikt.\n\n1. Welke Informatie Verzamelen Wij?\n\nDeze app is een statische webapplicatie die uitsluitend lokaal in uw browser (of via een WebView op Android) draait. Wij verzamelen geen persoonlijk identificeerbare informatie.\n\n- Favoriete Voorstellingen: Wanneer u een voorstelling als favoriet markeert, wordt deze informatie uitsluitend lokaal opgeslagen op uw apparaat in de lokale opslag van de browser (localStorage). Deze gegevens worden niet naar externe servers verzonden en zijn alleen toegankelijk voor u.\n\n- Notificatietoestemming: De app kan u om toestemming vragen om browsernotificaties te tonen voor herinneringen aan voorstellingen. Uw keuze wordt lokaal door uw browser beheerd en niet door ons verzameld of opgeslagen.\n\n- Zoekopdrachten: Zoektermen die u invoert, worden niet opgeslagen of verzonden. Ze worden alleen gebruikt om lokaal de timetable te filteren.\n\n2. Hoe Gebruiken Wij Uw Informatie?\n\nDe lokaal opgeslagen informatie wordt alleen gebruikt om u een gepersonaliseerde ervaring binnen de app te bieden.\n\n3. Delen van Uw Informatie\n\nWij delen uw informatie met niemand. Aangezien we geen persoonlijke informatie verzamelen, is er geen informatie om te delen.\n\n4. Externe Links\n\nDeze app bevat links naar externe websites (bijv. Google Calendar). Wanneer u op deze links klikt, verlaat u onze app. Wij zijn niet verantwoordelijk voor het privacybeleid van andere websites.\n\n5. Beveiliging\n\nAangezien alle relevante gegevens lokaal op uw apparaat worden opgeslagen, zijn de beveiligingsrisico's minimaal.\n\n6. Wijzigingen in Dit Privacybeleid\n\nWe kunnen dit privacybeleid van tijd tot tijd bijwerken. Wijzigingen zijn onmiddellijk van kracht nadat ze in de app zijn geplaatst.\n\n7. Contact Met Ons Opnemen\n\nAls u vragen heeft over dit privacybeleid, kunt u contact met ons opnemen via: Info@cafetheaterfestival.nl`
    }
  },
  en: {
    common: {
      timetable: 'Timetable', blockTimetable: 'Timetable', favorites: 'Favorites',
      searchPlaceholder: 'Search by artist, title, or location...', loading: 'Timetable is loading...',
      errorOops: 'Oops, something went wrong!',
      errorLoading: 'Error loading the timetable. Please try again later or check the URL/sheet structure.',
      errorTimeout: 'The connection timed out. Please check your internet connection and try again.',
      offlineIndicator: 'Offline mode: The data shown may be outdated.', tryAgain: 'Try again',
      noFavoritesFound: 'No favorite shows found.', noSearchResults: 'No results found for \'%s\'.',
      noDataFound: 'No performances found for %s.',
      noFilterResultsForEvent: 'There are no performances in this event that match these filters.',
      moreInfo: 'More Info',
      news: 'News',
      addToFavorites: 'Add to favorites (get reminder)', removeFromFavorites: 'Remove from favorites (cancel reminder)',
      addToGoogleCalendar: 'Add to Google Calendar', sharePerformance: 'Share performance',
      close: 'Close popup', privacyPolicy: 'Privacy Policy', becomeRegularGuest: 'Become a Stamgast!',
      becomeStamgastButton: 'BECOME STAMGAST!',
      becomeRegularGuestShort: 'Stamgast',
      forEvent: 'for %s', onThisDay: 'on this day',
      noContentAvailable: 'No content available for this popup.',
      'openLocationInGoogleMaps': 'Open location in Google Maps',
      wheelchairAccessible: 'Wheelchair Accessible', suitableForChildren: 'Suitable for children',
      dutchLanguage: 'Dutch language', englishLanguage: 'English language', dialogueFree: 'Dialogue Free',
      diningFacility: 'Dining Facility',
      tooltipWheelchair: 'This location is wheelchair accessible and has a disabled toilet',
      tooltipChildren: 'This performance is suitable for children aged 8 and up',
      tooltipDutch: 'This performance contains Dutch text',
      tooltipEnglish: 'This performance contains English text',
      tooltipDialogueFree: 'This performance contains no spoken text',
      tooltipDining: 'You can eat at this location',
      tooltipNGT: 'A Dutch Sign Language interpreter is present at this performance',
      notificationTitle: 'Reminder: Performance starts soon!',
      notificationBody: '%s at %s starts in 20 minutes.',
      genericNotificationTitle: 'Café Theater Festival', crowdLevel: 'Expected crowd:',
      genre: 'Genre', location: 'Location',
      tooltipCrowdLevelGreenFull: 'The expected crowd for this performance is normal. If you arrive on time, you will probably find a seat!',
      tooltipCrowdLevelOrangeFull: 'The expected crowd for this performance is busy. We expect some of the audience to stand to see it well.',
      tooltipCrowdLevelRedFull: 'The expected crowd for this performance is very busy. Arrive on time, as this performance might fill up.',
      tooltipCrowdLevelFull: 'This performance is full! You can still go to one of the other performances.',
      shareSuccess: 'Link copied to clipboard!', shareError: 'Share failed.',
      shareBody: 'Check out this performance: %s at the Café Theater Festival!',
      exactAlarmPermissionNeededTitle: 'Set up Notifications',
      exactAlarmPermissionNeededBody: 'For reliable reminders, the app needs the "Alarms & reminders" permission. Please enable it for the best experience.',
      openSettings: 'Settings', mapTitle: 'Map %s', allPerformances: 'All performances',
      calmRoute: 'Calm Route', 
      reserve: 'Reserve',
      reservationTitle: 'Reservation for %s',
      reservationName: 'Name',
      reservationEmail: 'Email address',
      reservationPhone: 'Phone number',
      reservationAmount: 'Number of spots',
      reservationSubmit: 'Reserve now',
      reservationSuccess: 'Thank you for your reservation!',
      reservationCapacity: 'Available spots: %s',
      reservationError: 'Something went wrong. Please try again.',
      utrechtCentraal: 'Utrecht Centraal', // NIEUW
      proudMainSponsor: 'Is proud main sponsor of %s',
      chooseCity: 'Choose city', cardView: 'Performances', geannuleerd: 'Cancelled', vol: 'Full',
      tooltipCrowdLevelCancelled: 'This performance has been cancelled.',
      cancellationNotificationTitle: 'Performance Cancelled',
      cancellationNotificationBody: 'Please note: %s has been cancelled. Check the app for an alternative!',
      fullNotificationTitle: 'Performance Full',
      fullNotificationBody: 'Unfortunately, the performance %s is full. Check the app for an alternative!',
      dontAskAgain: 'Don\'t ask again', later: 'Later', exportFavorites: 'Export Favorites',
      exportFavoritesTitle: 'Export your favorites', exporting: 'Exporting...',
      exportError: 'Error during export. Please try again.', shareFavorites: 'Share my CTF Favorites!',
      shareAsImage: 'Image', shareAsLink: 'Share as link', shareLinkTitle: 'My CTF Favorites',
      shareLinkBody: 'Hi! These are my favorite performances for the Café Theater Festival. Open the link to view them and import them into your own timetable app!',
      importFavorites: 'Import Favorites', import: 'Import', cancel: 'Cancel',
      favoritesFromFriend: 'A friend\'s favorites', importSuccess: 'Successfully imported friend\'s favorites!',
      friendsFavorites: 'Friends\' Favorites', noFriendsFavoritesFound: 'No friends\' favorites found.',
      removeFriendsFavorites: 'Remove friends\' favorites', filterByIcon: 'Filter by icon...',
      filterScopeAllEvents: 'All events', filterScopeThisEvent: 'This event',
      filterByGenre: 'Filter by genre...', filterScopeLabel: 'Apply filter',
      readPage: 'Read page aloud', readPerformance: 'Read performance aloud', readPopup: 'Read popup aloud',
      accessibility: 'Accessibility',
      grayscale: 'Grayscale',
      highContrast: 'High Contrast',
      negativeContrast: 'Negative Contrast',
      underlineLinks: 'Underline Links',
      readableFont: 'Readable Font',
      resetAccessibility: 'Reset',
      general: 'General',
      footerText: 'The Café Theater Festival is made possible by its partners and benefactors:',
      footerIntroText: 'The CTF blends performing arts and the hospitality industry into a place where nothing is as it seems. Besides the annual festivals in Utrecht, Arnhem, and Rotterdam, the CTF organizes smaller events throughout the year.',
      back: 'Back',
      performanceSchedule: 'Schedule',
      // START WIJZIGING
      aboutCreators: 'About the Creators',
      aboutShow: 'About the Performance',
      // EINDE WIJZIGING
      routes: 'Routes',
      chooseRoute: 'Choose a route',
      addRouteToFavorites: 'Add entire route to favorites',
      removeRouteFromFavorites: 'Remove route from favorites',
      routeAdded: 'Route added to favorites!',
      routeRemoved: 'Route removed from favorites.',
      chooseDate: 'Choose a date',
      helpChoosing: 'Need help choosing?',
      chooseEvent: 'Which festival are you visiting?',
      seeSomethingElse: 'See something else?',
      similarShow: 'Something similar',
      differentShow: 'Something completely different',
      nearbyShow: 'Something nearby',
      advertisement: 'Advertisement',
      howPWYCWorks: 'How does Pay What You Can work?',
    },
    appDownload: {
      title: 'Download the CTF app!',
      popupTitle: 'Download the CTF app now!',
      playStoreAlt: 'Get it on Google Play',
      appStoreAlt: 'Download on the App Store',
    },
    cookiePopup: {
      title: 'We use cookies',
      text: 'This website uses cookies to enhance your experience, analyze performance, and personalize marketing. By clicking "Accept All", you agree to the use of all cookies. You can adjust your preferences by clicking "Functional Only" or decline all non-essential cookies with "Decline".',
      acceptAll: 'Accept All',
      acceptFunctional: 'Functional Only',
      decline: 'Decline'
    },
    genres: {
        'Muziektheater': 'Musical Theater', 'Musical': 'Musical', 'Opera': 'Opera', 'Dans': 'Dance',
        'Club-stijl dans': 'Club-style Dance', 'Hip-hop dans': 'Hip-hop Dance', 'Theater': 'Theater',
        'Teksttoneel': 'Text-based Theater', 'Fysiek theater': 'Physical Theater',
        'Beeldend theater': 'Visual Theater', 'Mime': 'Mime', 'Performance': 'Performance',
        'Kindertheater': 'Family Theater', 'Kinderdans': 'Family Dance', 'Interactief': 'Interactive',
        'Clownerie': 'Clowning', 'Circus': 'Circus', 'Poëzie en muziek': 'Poetry and Music',
        'Drag': 'Drag', 'Burlesque': 'Burlesque', 'Variéte': 'Variéte', 'Storytelling': 'Storytelling',
        'Inclusief theater': 'Inclusive theater', 'Documentair theater': 'Documentairy theater',
        'Community theater': 'Community theater', 'Improvisatietheater':'Improvised theater', 'Dans & Poëzie':'Dance and Poetry', 'Dans & Muziek':'Dance & Music','Muziek & Storytelling':'Music & Storytelling'
    },
    payWhatYouCan: {
      title: "Pay What You Can",
      text: `At CTF you never have to buy a ticket or reserve a spot! We think that is important because we play in cafes, and we also want to invite people who don't come for the performance to stay and experience the performance. Nevertheless, we ask the audience to also financially contribute to the festival and the creators. We do this with our Pay What You Can system.\n\nAfter the performance, the makers will ask for a financial contribution of €6, €8, or €10 euro. We use different amounts because we want to be there for visitors with both small and large wallets. At CTF you can always pay with PIN, or via a QR code with Tikkie.\n\nPlease note: Paying via Tikkie does not count as a reservation. It is best to arrive at the performance on time and make a Pay What You Can donation afterwards.`
    },
    crowdMeterInfo: {
      title: "Explanation Crowd Meter",
      text: `This is our crowd meter! Here you can see in advance how busy we expect a performance to be. We update this crowd meter live, so you can see in your app if a performance is full.\n\n**Explanation of colors:**\n\n**Green**= The expected crowd for this performance is normal. If you arrive on time, you will probably find a seat\n\n**Orange**= The expected crowd for this performance is busy. We expect some of the audience to stand to see it well.\n\n**Red**= The expected crowd for this performance is very busy. Arrive on time, as this performance might fill up\n\n**Red bar with cross**= This performance is full! You can still go to one of the other performances`
    },
    calmRouteInfo: {
        title: 'Calm Route',
        text: `Not everyone enjoys a crowded and busy café, which is why we created the Calm Route. For each festival, there are two performances for which it is possible to reserve a spot, ensuring you have a seat. Additionally, the selected performances will also be quieter than some other performances at the festival.\n\nPlease note: the performances in the calm route are not low-stimulus. Due to the unpredictable nature of the café space and the fact that many performances use the entire space, we cannot guarantee a low-stimulus environment for any performance.`,
        button: 'Reserve a spot'
    },
    privacyPolicyContent: `**Privacy Policy for the Café Theater Festival Webapp**\n\n*Last updated: September 7, 2025*\n\nWelcome to the Café Theater Festival Webapp. This app is designed to help you view the festival timetable, mark performances as favorites, set reminders, and add events to your calendar.\n\nYour privacy is important to us. This privacy policy describes how we collect, use, and protect information when you use our app.\n\n**1. What Information Do We Collect?**\n\n- **Favorite Performances**: When you mark a performance as a favorite, this information is stored exclusively locally on your device in the browser's local storage (localStorage). This data is not sent to external servers.\n\n- **Notification Permission**: The app may ask for your permission to display browser notifications for performance reminders. Your choice is managed locally by your browser.\n\n- **Analytics Data (with consent)**: If you consent to all cookies, we collect anonymous usage data through Google Analytics. This includes information like which pages are visited and which buttons are clicked. This data is anonymous, cannot be traced back to you as an individual, and is used to improve the app. We do not collect IP addresses.\n\n**2. How Do We Use Your Information?**\n\nThe locally stored information is only used to provide you with a personalized experience within the app. Analytical data helps us understand how the app is used, so we can optimize it for future editions of the festival.\n\n**3. Sharing Your Information**\n\nWe do not share your locally stored information (like favorites) with anyone. The anonymous analytical data collected after your consent is processed by Google. For more information, you can consult [Google's privacy policy](https://policies.google.com/privacy).\n\n**4. Cookies and Consent**\n\nThe app will ask for your consent to use cookies on your first visit.\n\n- **Functional Cookies**: These are cookies that are strictly necessary for the app to function, such as remembering your favorites and language preference.\n\n- **Analytical Cookies (Optional)**: Only after your explicit consent ("Accept All") will we place cookies for Google Analytics. You can fully use the app without accepting these cookies.\n\n**5. External Links**\n\nThis app contains links to external websites (e.g., Google Calendar). When you click these links, you leave our app. We are not responsible for the privacy practices of other websites.\n\n**6. Security**\n\nAs all personal data is stored locally on your device, the security risks are minimal.\n\n**7. Changes to This Privacy Policy**\n\nWe may update this privacy policy from time to time. Changes are effective immediately after being posted in the app.\n\n**8. Contact Us**\n\nIf you have questions about this privacy policy, you can contact us at: Info@cafetheaterfestival.nl`,
    appPrivacyPolicy: {
        title: 'Privacy Policy for the Café Theater Festival Timetable App',
        content: `Last updated: June 30, 2025\n\nWelcome to the Café Theater Festival Timetable App. This app is designed to help you view the festival timetable, mark shows as favorites, set reminders, and add events to your calendar.\n\nYour privacy is important to us. This privacy policy describes how we collect, use, and protect information when you use our app.\n\n1. What Information Do We Collect?\n\nThis app is a static web application that runs exclusively locally in your browser (or via a WebView on Android). We do not collect personally identifiable information.\n\n- Favorite Shows: When you mark a show as a favorite, this information is stored exclusively locally on your device in the browser's local storage (localStorage). This data is not sent to external servers and is only accessible to you.\n\n- Notification Permission: The app may ask for your permission to show browser notifications for show reminders. Your choice is managed locally by your browser and is not collected or stored by us.\n\n- Searches: Search terms you enter are not stored or sent. They are only used to filter the timetable locally.\n\n2. How Do We Use Your Information?\n\nThe locally stored information is used only to provide you with a personalized experience within the app.\n\n3. Sharing Your Information\n\nWe do not share your information with anyone. Since we do not collect personal information, there is no information to share.\n\n4. External Links\n\nThis app contains links to external websites (e.g., Google Calendar). When you click these links, you leave our app. We are not responsible for the privacy policies of other websites.\n\n5. Security\n\nSince all relevant data is stored locally on your device, the security risks are minimal.\n\n6. Changes to This Privacy Policy\n\nWe may update this privacy policy from time to time. Changes are effective immediately after they are posted in the app.\n\n7. Contact Us\n\nIf you have questions about this privacy policy, you can contact us at: Info@cafetheaterfestival.nl`
    }
  },
};

const getSafetyIcons = (translations, language) => [
    { key: 'wheelchairAccessible', url: 'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/CTF-ICONS_Rolstoeltoegankelijk-kopie.png', tooltip: translations[language].common.tooltipWheelchair, label: translations[language].common.wheelchairAccessible },
    { key: 'diningFacility', url: 'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/CTF-ICONS_Eetmogelijkheid-kopie.png', tooltip: translations[language].common.tooltipDining, label: translations[language].common.diningFacility },
    { key: 'suitableForChildren', url: 'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/CTF-ICONS_Geschikt-Voor-Kinderen-kopie.png', tooltip: translations[language].common.tooltipChildren, label: translations[language].common.suitableForChildren },
    { key: 'dutchLanguage', url: 'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/CTF-ICONS_NL-kopie.png', tooltip: translations[language].common.tooltipDutch, label: translations[language].common.dutchLanguage },
    { key: 'englishLanguage', url: 'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/CTF-ICONS_ENG-kopie.png', tooltip: translations[language].common.tooltipEnglish, label: translations[language].common.englishLanguage },
    { key: 'dialogueFree', url: 'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/CTF-ICONS_DIALOGUE-FREE-kopie.png', tooltip: translations[language].common.tooltipDialogueFree, label: translations[language].common.dialogueFree },
    { key: 'hasNGT', url: 'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/vgtliggend-1-removebg-preview.png', tooltip: translations[language].common.tooltipNGT, label: 'Tolk NGT' },
];

const applyFormatting = (text) => {
    return text
        .replace(/\[b\](.*?)\[b\]/g, '<strong>$1</strong>')
        .replace(/\[i\](.*?)\[i\]/g, '<em>$1</em>')
        .replace(/\[u\](.*?)\[u\]/g, '<u>$1</u>');
};

const renderPrivacyPolicyContent = (content, textColorClass = 'text-gray-700') => {
  const lines = content.trim().split('\n');
  const elements = [];
  let currentList = [];

  const addCurrentList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className={`list-disc pl-5 mb-4 ${textColorClass}`}>
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.match(/^\d+\.\s/)) { 
      addCurrentList();
      elements.push(<h3 key={`h3-${index}`} className={`text-xl font-bold mb-2 ${textColorClass}`}>{trimmedLine}</h3>);
    } else if (trimmedLine.startsWith('- ')) { 
      const listItemContent = trimmedLine.substring(2).trim();
      currentList.push(
        <li key={`li-${index}`} dangerouslySetInnerHTML={{ __html: applyFormatting(listItemContent) }} />
      );
    } else if (trimmedLine === '') { 
      addCurrentList();
    } else { 
      addCurrentList();
      elements.push(
        <p key={`p-${index}`} dangerouslySetInnerHTML={{ __html: applyFormatting(trimmedLine) }} className={`mb-4 last:mb-0 ${textColorClass}`} />
      );
    }
  });

  addCurrentList();

  return elements;
};

const renderGenericPopupText = (content) => {
  const lines = content.trim().split('\n\n');
  const elements = lines.map((line, index) => (
      <p key={`p-${index}`} dangerouslySetInnerHTML={{ __html: applyFormatting(line) }} className="mb-4 last:mb-0 text-black" />
  ));
  return elements;
};

const CustomTextRenderer = ({ text, imageUrl, title = 'Afbeelding', textColorClass = 'text-white', layout = 'default' }) => {
    if (!text) return null;

    const parseLine = (line) => {
        line = applyFormatting(line); // Apply b, i, u formatting
        line = line.replace(
            /(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/g,
            '<a href="mailto:$1" class="underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        line = line.replace(
            /(\S+)\s*\[(https?:\/\/[^\s\]]+)\]/g,
            '<a href="$2" class="underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        line = line.replace(
            /\[(https?:\/\/[^\s\]]+)\]/g,
            '<a href="$1" class="underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        line = line.replace(
            /\[button:(.*?):(https?:\/\/[^\s\]]+)\]/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-block bg-[#78b5e3] text-black font-bold py-2 px-4 rounded-lg hover:bg-[#9f4493] transition-colors no-underline">$1</a>'
        );
        return line;
    };

    const elements = text.split('\n').map((line, index) => {
        let content = line.trim();

        const photoMatch = content.match(/^\[foto:(https?:\/\/[^\]]+)\]$/);
        if (photoMatch && photoMatch[1]) {
            return (
                <img
                    key={`img-${index}`}
                    src={photoMatch[1]}
                    alt={`Ingevoegde afbeelding`}
                    className="rounded-lg shadow-lg w-full h-auto object-cover my-6"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            );
        }

        if (content.endsWith('[h1]')) {
            const parsedContent = parseLine(content.slice(0, -4).trim());
            return <h3 key={index} className={`text-2xl font-bold mb-4 ${textColorClass}`} dangerouslySetInnerHTML={{ __html: parsedContent }} />;
        }
        if (content.endsWith('[h2]')) {
            const parsedContent = parseLine(content.slice(0, -4).trim());
            return <h4 key={index} className={`text-xl font-bold mb-3 ${textColorClass}`} dangerouslySetInnerHTML={{ __html: parsedContent }} />;
        }
        if (content.endsWith('[h3]')) {
            const parsedContent = parseLine(content.slice(0, -4).trim());
            return <h5 key={index} className={`text-lg font-bold mb-2 ${textColorClass}`} dangerouslySetInnerHTML={{ __html: parsedContent }} />;
        }
        if (content === '') return <br key={index} />;
        
        const parsedContent = parseLine(content);
        return <p key={index} className={`mb-4 ${textColorClass}`} dangerouslySetInnerHTML={{ __html: parsedContent }} />;
    });

    if (layout === 'side-by-side' && imageUrl) {
        return (
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="md:w-1/2 flex-shrink-0">
                    <img
                        src={imageUrl}
                        alt={`Afbeelding van ${title}`}
                        className="rounded-lg shadow-lg w-full h-auto object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
                <div className="md:w-1/2 prose prose-invert max-w-none">
                    {elements}
                </div>
            </div>
        );
    }

    return (
        <div className="prose prose-invert max-w-none">
            {imageUrl && (
                <img 
                    src={imageUrl} 
                    alt={`Afbeelding van ${title}`}
                    className="rounded-lg shadow-lg w-full h-72 object-cover mb-6"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            )}
            {elements}
        </div>
    );
};


const TopRightControls = ({ language, handleLanguageChange, translations }) => (
    <div className="absolute top-12 right-4 z-10 flex flex-row items-center space-x-2">
        <button onClick={handleLanguageChange} className="px-3 py-1 h-8 sm:h-10 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm font-semibold">
            {language === 'nl' ? 'EN' : 'NL'}
        </button>
    </div>
);


const AppHeader = ({ titleRef, translations, language }) => (
  <div className="flex flex-col items-center w-full pt-12">
    <img src="https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/Logo_Web_Trans_Wit-1.png" alt="Afbeelding van Café Theater Festival Logo met tekst: Café Theater Festival" className="w-full max-w-[10rem] h-auto mb-4"/>
  </div>
);

// ========= WIJZIGING: StickyHeader aangepast voor 'Open Call' navigatie =========
const StickyHeader = ({ isVisible, uniqueEvents, handleEventClick, handleFavoritesClick, handleFriendsFavoritesClick, handleMoreInfoClick, handleAccessibilityClick, hasFriendsFavorites, selectedEvent, currentView, language, handleLanguageChange, translations, onLogoClick, openContentPopup, isInitialLoad }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    let currentSelectionText = translations[language].common.chooseCity;
    if (currentView === 'favorites') currentSelectionText = translations[language].common.favorites;
    else if (currentView === 'friends-favorites') currentSelectionText = translations[language].common.friendsFavorites;
    else if (currentView === 'more-info') currentSelectionText = translations[language].common.moreInfo;
    else if (currentView === 'accessibility') currentSelectionText = translations[language].common.accessibility;
    else if (selectedEvent) currentSelectionText = selectedEvent;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
        };
        if (isDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isDropdownOpen]);
    
    return (
        <div className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
                <div className="relative flex h-24 sm:h-20 items-end justify-center bg-black/20 backdrop-blur-md rounded-b-xl px-4 shadow-lg pb-2">
                    <div className="absolute left-4 bottom-2 flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
                       {isInitialLoad ? (
                           <img onClick={onLogoClick} className="h-16 w-auto cursor-pointer" src="https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/fav-wit-1.png" alt="Afbeelding van Café Theater Festival Logo"/>
                       ) : (
                           <button 
                                onClick={onLogoClick}
                                className="px-4 py-2 rounded-lg font-semibold bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm flex items-center gap-2"
                            >
                                <svg xmlns="https://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                                {translations[language].common.back}
                           </button>
                       )}
                       <button 
                            onClick={() => openContentPopup('iframe', 'https://stamgast.cafetheaterfestival.nl/')} 
                            className="px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-lg font-semibold bg-[#78b5e3] text-black hover:bg-[#9f4493] transition-colors duration-200"
                        >
                            <span className="hidden sm:inline">{translations[language].common.becomeRegularGuest}</span>
                            <span className="sm:hidden">{translations[language].common.becomeRegularGuestShort}</span>
                        </button>
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="inline-flex justify-center w-full rounded-md border border-gray-500 shadow-sm px-4 py-2 bg-white/30 text-sm font-medium text-white hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                                {currentSelectionText}
                                <svg className="-mr-1 ml-2 h-5 w-5" xmlns="https://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4 4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                            {isDropdownOpen && (
                                <div className="origin-top-right absolute right-1/2 translate-x-1/2 mt-2 w-56 rounded-md shadow-lg bg-[#1a5b64] ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                        {uniqueEvents.map(event => (<button key={event} onClick={() => { handleEventClick(event); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{event}</button>))}
                                        <div className="border-t border-white/20 my-1"></div>
                                        <button onClick={() => { handleFavoritesClick(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{translations[language].common.favorites}</button>
                                        {hasFriendsFavorites && <button onClick={() => { handleFriendsFavoritesClick(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{translations[language].common.friendsFavorites}</button>}
                                        <div className="border-t border-white/20 my-1"></div>
                                        <button onClick={() => { handleMoreInfoClick(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{translations[language].common.moreInfo}</button>                                        
                                        <button onClick={() => { handleAccessibilityClick(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{translations[language].common.accessibility}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="absolute right-4 bottom-2 flex items-center space-x-2">
                        <button onClick={handleLanguageChange} className="px-3 py-1 h-8 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-xs font-semibold">{language === 'nl' ? 'EN' : 'NL'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ========= WIJZIGING: EventNavigation aangepast voor 'Open Call' navigatie =========
const EventNavigation = ({ onEventSelect, onFavoritesSelect, onFriendsFavoritesSelect, onMoreInfoSelect, onAccessibilitySelect, onHelpChoosingSelect, hasFriendsFavorites, uniqueEvents, language, translations, eventInfoMap }) => {
    const baseDelay = 100; // Vertraging in ms per item voor de 'staggered' animatie
    const hasEvents = uniqueEvents && uniqueEvents.length > 0;

    const eventButtons = uniqueEvents.map((event, index) => {
        // AANGEPAST: Vervang 'tm' door 't/m' in de datumweergave
        const dates = eventInfoMap?.[event]?.displayDates?.replace(/ tm /gi, ' t/m ');
        
        // Bereken vertraging op basis van de positie
        const delay = index * baseDelay;
        
        return (
            <button 
                key={event} 
                onClick={() => onEventSelect(event)} 
                className="animate-fade-in-up px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-[#78b5e3] bg-opacity-80 text-black hover:bg-[#9f4493] flex flex-col items-center justify-center opacity-0" // opacity-0 start onzichtbaar
                style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }} // forwards zorgt dat hij zichtbaar blijft na animatie
            >
                <h1 className="text-lg font-semibold">{event}</h1>
                {dates && <span className="text-md font-normal mt-1 opacity-90 hidden md:block">{dates}</span>}
            </button>
        );
    });

    // Configuratie voor de overige knoppen om ze makkelijk te mappen met vertraging
    const utilityButtonsConfig = [
        hasEvents ? { onClick: onHelpChoosingSelect, label: translations[language].common.helpChoosing } : null,
        { onClick: onFavoritesSelect, label: translations[language].common.favorites },
        hasFriendsFavorites ? { onClick: onFriendsFavoritesSelect, label: translations[language].common.friendsFavorites } : null,
        { onClick: onMoreInfoSelect, label: translations[language].common.moreInfo },
        { onClick: onAccessibilitySelect, label: translations[language].common.accessibility }
    ].filter(Boolean);

    const utilityButtons = utilityButtonsConfig.map((btn, index) => {
        // De vertraging gaat verder waar de events ophielden
        const delay = (hasEvents ? uniqueEvents.length : 1) * baseDelay + (index * baseDelay);
        
        return (
            <button 
                key={btn.label} 
                onClick={btn.onClick} 
                className="animate-fade-in-up px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-[#78b5e3] bg-opacity-80 text-black hover:bg-[#9f4493] flex flex-col items-center justify-center opacity-0"
                style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
            >
                <h1 className="text-lg font-semibold">{btn.label}</h1>
            </button>
        );
    });

    return (
        <div className="flex flex-col items-center gap-4 mb-8 p-3 max-w-full">
            {hasEvents ? (
                <div className="flex flex-wrap justify-center gap-4">
                    {eventButtons}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center mb-6 px-4 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
                    <p className="text-xl md:text-2xl font-bold text-white mb-6 drop-shadow-md max-w-2xl leading-relaxed">
                        {language === 'nl' 
                            ? 'Het CTF 2026 zit er weer op! In maart zijn we er weer voor het CTF 2027.' 
                            : 'CTF 2026 is a wrap! We will be back in March for CTF 2027.'}
                    </p>
                    <button 
                        onClick={() => window.location.href = 'https://archief.cafetheaterfestival.nl'} 
                        className="animate-fade-in-up px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-[#78b5e3] bg-opacity-80 text-black hover:bg-[#9f4493] flex flex-col items-center justify-center shadow-lg opacity-0"
                        style={{ animationDelay: `${baseDelay}ms`, animationFillMode: 'forwards' }}
                    >
                        <h1 className="text-lg font-semibold">{language === 'nl' ? 'Archief' : 'Archive'}</h1>
                    </button>
                </div>
            )}
            <div className="flex flex-wrap justify-center gap-4">
                {utilityButtons}
            </div>
        </div>
    );
};

const DateNavigation = ({ datesForCurrentSelectedEvent, selectedDate, setSelectedDate, setSearchTerm, translations, language, selectedEvent, timetableData }) => {
    const hasCalmRoutePerformances = useMemo(() => 
        timetableData.some(item => item.event === selectedEvent && item.isCalmRoute),
        [timetableData, selectedEvent]
    );

    // NIEUW: Check of Utrecht Centraal voorkomt in dit event
    const hasUtrechtCentraal = useMemo(() => 
        timetableData.some(item => 
            item.event === selectedEvent && 
            (item.location && item.location.toLowerCase().includes('utrecht centraal'))
        ),
        [timetableData, selectedEvent]
    );
    
    return (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-8 p-3 bg-white bg-opacity-20 rounded-xl shadow-lg max-w-full overflow-x-auto scrollbar-hide">
            <button onClick={() => { setSelectedDate('all-performances'); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === 'all-performances' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>{translations[language].common.allPerformances}</button>
            {datesForCurrentSelectedEvent.map(date => {
                // Check of alle voorstellingen op deze dag try-outs zijn
                const dayPerformances = timetableData.filter(item => item.event === selectedEvent && item.date === date);
                const isAllTryOuts = dayPerformances.length > 0 && dayPerformances.every(item => item.isTryOut);

                return (
                    <button key={date} onClick={() => { setSelectedDate(date); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === date ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>
                        {date}{isAllTryOuts ? ' (try-outs)' : ''}
                    </button>
                );
            })}
            
            {/* NIEUW: Utrecht Centraal Button */}
            {hasUtrechtCentraal && (
                <button onClick={() => { setSelectedDate('utrecht-centraal'); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === 'utrecht-centraal' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>
                    {translations[language].common.utrechtCentraal}
                </button>
            )}

            {hasCalmRoutePerformances && (<button onClick={() => { setSelectedDate('calm-route'); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === 'calm-route' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>{translations[language].common.calmRoute}</button>)}
        </div>
    );
};

const SponsorDisplay = React.forwardRef(({ sponsorInfo, language, translations }, ref) => {
    if (!sponsorInfo || !sponsorInfo.logoUrl) return <div ref={ref} className="h-12"></div>;

    return (
        <div ref={ref} className="flex flex-col items-center justify-center mt-12 mb-8 text-center">
            <img src={sponsorInfo.logoUrl} alt={`Afbeelding van Logo ${sponsorInfo.eventName}`} className="max-h-20 w-auto object-contain mb-2"/>
            <p className="text-white text-lg font-semibold">{translations[language].common.proudMainSponsor.replace('%s', sponsorInfo.eventName)}</p>
        </div>
    );
});

const SearchBar = ({ searchTerm, setSearchTerm, translations, language }) => (
  <div className="w-full max-w-md mx-auto">
    <input type="text" placeholder={translations[language].common.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-[#1a5b64] focus:ring focus:ring-[#1a5b64] focus:ring-opacity-50 text-gray-800 shadow-md"/>
  </div>
);

const GenreFilterDropdown = ({
  genreFilters,
  setGenreFilters,
  allGenres,
  language,
  translations
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleFilterChange = (genreKey) => {
    setGenreFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(genreKey)) {
        newFilters.delete(genreKey);
      } else {
        newFilters.add(genreKey);
      }
      return newFilters;
    });
  };

  const selectedCount = genreFilters.size;

  return (
    <div className="w-full">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 rounded-lg bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 flex justify-between items-center text-left"
      >
        <span className="truncate">
          {selectedCount > 0
            ? `${selectedCount} genre${selectedCount > 1 ? 's' : ''} geselecteerd`
            : translations[language].common.filterByGenre}
        </span>
        <svg className={`h-5 w-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="https://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>

      {isOpen && (
        <div ref={menuRef} className="absolute top-full left-0 w-full mt-2 bg-[#1a5b64] text-white rounded-lg shadow-xl z-20 p-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allGenres.map(genre => (
              <label key={genre.key} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/10 rounded-md">
                <input
                  type="checkbox"
                  checked={genreFilters.has(genre.key)}
                  onChange={() => handleFilterChange(genre.key)}
                  className="h-5 w-5 rounded bg-white/30 text-[#2e9aaa] focus:ring-0"
                />
                <span>{genre.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const IconFilterDropdown = ({
  iconFilters,
  setIconFilters,
  filterScope,
  setFilterScope,
  safetyIcons,
  language,
  translations
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]); 

  const handleFilterChange = (iconKey) => {
    setIconFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(iconKey)) {
        newFilters.delete(iconKey);
      } else {
        newFilters.add(iconKey);
      }
      return newFilters;
    });
  };

  const selectedCount = iconFilters.size;

  return (
    <div className="w-full">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 rounded-lg bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 flex justify-between items-center text-left"
      >
        <span className="truncate">
          {selectedCount > 0
            ? `${selectedCount} filter${selectedCount > 1 ? 's' : ''} actief`
            : translations[language].common.filterByIcon}
        </span>
        <svg className={`h-5 w-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="https://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>

      {isOpen && (
        <div ref={menuRef} className="absolute top-full left-0 w-full mt-2 bg-[#1a5b64] text-white rounded-lg shadow-xl z-20 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">{translations[language].common.filterScopeLabel}:</span>
            <div className="flex items-center bg-white/20 rounded-full p-1">
              <button onClick={() => setFilterScope('current')} className={`px-3 py-1 text-sm rounded-full ${filterScope === 'current' ? 'bg-[#2e9aaa]' : ''}`}>{translations[language].common.filterScopeThisEvent}</button>
              <button onClick={() => setFilterScope('all')} className={`px-3 py-1 text-sm rounded-full ${filterScope === 'all' ? 'bg-[#2e9aaa]' : ''}`}>{translations[language].common.filterScopeAllEvents}</button>
            </div>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {safetyIcons.map(icon => (
              <label key={icon.key} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/10 rounded-md">
                <input
                  type="checkbox"
                  checked={iconFilters.has(icon.key)}
                  onChange={() => handleFilterChange(icon.key)}
                  className="h-5 w-5 rounded bg-white/30 text-[#2e9aaa] focus:ring-0"
                />
                <img src={icon.url} alt={icon.label} className="h-6 w-auto" />
                <span>{icon.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const EventViewSwitcher = ({ viewMode, setViewMode, language, translations, handleAnimatedUpdate, hasRoutes, onOpenRoutes }) => (
  <div className="flex flex-wrap justify-center gap-4 my-8">
    <button
      onClick={() => handleAnimatedUpdate(() => setViewMode('card'))}
      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${viewMode === 'card' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}
    >
      {translations[language].common.cardView}
    </button>
    <button
      onClick={() => handleAnimatedUpdate(() => setViewMode('block'))}
      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${viewMode === 'block' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}
    >
      {translations[language].common.blockTimetable}
    </button>
    {hasRoutes && (
        <button
          onClick={onOpenRoutes}
          className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 bg-[#78b5e3] text-black shadow-md hover:bg-[#9f4493]"
        >
          {translations[language].common.routes}
        </button>
    )}
  </div>
);

const SearchFilterNudges = ({
    searchTerm,
    setSearchTerm,
    genreFilters,
    setGenreFilters,
    allGenres,
    iconFilters,
    setIconFilters,
    filterScope,
    setFilterScope,
    safetyIcons,
    language,
    translations
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const nudgeRef = useRef(null);

    const toggleSearch = () => {
        setIsSearchOpen(prev => !prev);
        if (isFilterOpen) setIsFilterOpen(false);
    };

    const toggleFilter = () => {
        setIsFilterOpen(prev => !prev);
        if (isSearchOpen) setIsSearchOpen(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (nudgeRef.current && !nudgeRef.current.contains(event.target)) {
                setIsSearchOpen(false);
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const SearchIcon = () => (
        <svg xmlns="https://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );

    const FilterIcon = () => (
        <svg xmlns="https://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
    );

    return (
        <div
            ref={nudgeRef}
            className={`fixed top-1/2 right-0 transform -translate-y-1/2 z-50 flex items-center ${!isSearchOpen && !isFilterOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
             <div className={`relative transition-all duration-300 ease-in-out w-80 h-[28rem] rounded-l-lg shadow-xl mr-[-1px] ${isSearchOpen || isFilterOpen ? 'translate-x-0 opacity-100 bg-[#1a5b64]' : 'translate-x-full opacity-0 bg-transparent'}`}>
                <div className={`absolute inset-0 p-4 text-white transition-opacity duration-300 pointer-events-none ${isSearchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
                    <h1 className="font-bold text-lg mb-4">{translations[language].common.searchPlaceholder.split('...')[0]}</h1>
                    <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} translations={translations} language={language} />
                </div>

                 <div className={`absolute inset-0 p-4 text-white transition-opacity duration-300 pointer-events-none ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
                    <h1 className="font-bold text-lg mb-4">{translations[language].common.filterByIcon.split('...')[0]}</h1>
                    <div className="space-y-4 relative">
                        <GenreFilterDropdown
                             genreFilters={genreFilters}
                             setGenreFilters={setGenreFilters}
                             allGenres={allGenres}
                             language={language}
                             translations={translations}
                        />
                        <IconFilterDropdown
                            iconFilters={iconFilters}
                            setIconFilters={setIconFilters}
                            filterScope={filterScope}
                            setFilterScope={setFilterScope}
                            safetyIcons={safetyIcons}
                            language={language}
                            translations={translations}
                        />
                    </div>
                </div>
            </div>
            <div className="flex flex-col space-y-2 pointer-events-auto">
                 <button
                    onClick={toggleSearch}
                    className={`w-14 h-14 bg-[#2e9aaa] rounded-l-full shadow-lg flex items-center justify-center hover:bg-[#20747f] transition-colors focus:outline-none pr-3 ${isSearchOpen ? 'bg-[#20747f]' : ''}`}
                    aria-label="Zoeken"
                    aria-expanded={isSearchOpen}
                >
                    <SearchIcon />
                </button>
                 <button
                    onClick={toggleFilter}
                    className={`w-14 h-14 bg-[#2e9aaa] rounded-l-full shadow-lg flex items-center justify-center hover:bg-[#20747f] transition-colors focus:outline-none pr-3 ${isFilterOpen ? 'bg-[#20747f]' : ''}`}
                    aria-label="Filteren"
                    aria-expanded={isFilterOpen}
                >
                    <FilterIcon />
                </button>
            </div>
        </div>
    );
};


// ========= NIEUW: Reservering Modal Component =========
const ReservationModal = ({ show, onClose, performance, language, translations }) => {
    const modalRef = useRef(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', amount: 1 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    useEffect(() => {
        if (show) {
            setSubmitStatus(null);
            setFormData({ name: '', email: '', phone: '', amount: 1 });
            const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements?.[0];
            const lastElement = focusableElements?.[focusableElements.length - 1];
            const previousActiveElement = document.activeElement;

            modalRef.current?.focus();

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') { onClose(); return; }
                if (event.key === 'Tab' && firstElement && lastElement) {
                    if (event.shiftKey) {
                        if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); }
                    } else {
                        if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); }
                    }
                }
            };

            const currentModal = modalRef.current;
            currentModal?.addEventListener('keydown', handleKeyDown);

            return () => {
                currentModal?.removeEventListener('keydown', handleKeyDown);
                previousActiveElement?.focus();
            };
        }
    }, [show, onClose]);

    if (!show || !performance) return null;

    const title = performance.artist ? `${performance.artist} - ${performance.title}` : performance.title;
    const resText = language === 'nl' ? performance.resTextNL : performance.resTextENG;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);
        try {
            const client = new Client().setEndpoint(APPWRITE_CONFIG.endpoint).setProject(APPWRITE_CONFIG.projectId);
            const databases = new Databases(client);
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.reserveringen,
                ID.unique(),
                {
                    Naam: formData.name,
                    Aantal: parseInt(formData.amount, 10),
                    email: formData.email,
                    telefoonnummer: formData.phone,
                    executionID: performance.id
                }
            );
            setSubmitStatus('success');
        } catch (err) {
            console.error("Fout bij reserveren:", err);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[90]">
            <div ref={modalRef} tabIndex="-1" role="dialog" aria-modal="true" className="bg-white text-gray-800 p-6 md:p-8 rounded-xl shadow-2xl relative w-[95vw] h-[90vh] max-w-2xl flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-3xl font-bold z-10" aria-label={translations[language].common.close}>&times;</button>
                <div className="overflow-y-auto flex-grow">
                    <h2 className="text-2xl font-bold mb-4 text-[#20747f]">{translations[language].common.reservationTitle.replace('%s', title)}</h2>
                    
                    {resText && (
                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: applyFormatting(resText).replace(/\n/g, '<br />') }} />
                )}

                    {submitStatus === 'success' ? (
                        <div className="bg-green-100 text-green-800 p-4 rounded-lg font-semibold text-center mt-4">
                            {translations[language].common.reservationSuccess}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">{translations[language].common.reservationName} *</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#20747f] outline-none" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">{translations[language].common.reservationEmail} *</label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#20747f] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">{translations[language].common.reservationPhone} *</label>
                                    <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#20747f] outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">
                                    {translations[language].common.reservationAmount} * {performance.resAvailableCapacity > 0 && <span className="ml-2 font-normal text-gray-500">({translations[language].common.reservationCapacity.replace('%s', performance.resAvailableCapacity)})</span>}
                                </label>
                                <input type="number" min="1" max={performance.resAvailableCapacity > 0 ? performance.resAvailableCapacity : undefined} required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#20747f] outline-none" />
                            </div>
                            
                            {submitStatus === 'error' && (
                                <p className="text-red-500 text-sm font-medium mt-2">{translations[language].common.reservationError}</p>
                            )}

                            <button type="submit" disabled={isSubmitting} className="w-full py-3 mt-4 bg-[#20747f] text-white rounded-lg font-bold hover:bg-[#1a5b64] transition-colors disabled:bg-gray-400">
                                {isSubmitting ? '...' : translations[language].common.reservationSubmit}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};


const PerformanceCard = ({ item, favorites, toggleFavorite, addToGoogleCalendar, openContentPopup, language, handleIconMouseEnter, handleIconMouseLeave, translations, showMessageBox, safetyIcons, hideTime = false, isExportMode = false, isFriendsView = false, onNavigate, isNavigable, onReservationClick }) => {
    const getCrowdLevelInfo = useCallback((level) => {
        const defaultInfo = { fullBar: false, position: '10%', tooltip: translations[language].common.tooltipCrowdLevelGreenFull, label: null, barClass: 'bg-gradient-to-r from-green-600 via-yellow-500 to-red-600' };
        switch (level?.toLowerCase()) {
            case 'oranje': case 'orange': return { ...defaultInfo, position: '50%', tooltip: translations[language].common.tooltipCrowdLevelOrangeFull };
            case 'rood': case 'red': return { ...defaultInfo, position: '90%', tooltip: translations[language].common.tooltipCrowdLevelRedFull };
            case 'vol': case 'full': return { ...defaultInfo, fullBar: true, label: language === 'nl' ? 'Vol' : 'Full', barClass: 'bg-red-600', tooltip: translations[language].common.tooltipCrowdLevelFull };
            case 'geannuleerd': case 'cancelled': return { ...defaultInfo, fullBar: true, label: translations[language].common.geannuleerd, barClass: 'bg-red-600', tooltip: translations[language].common.tooltipCrowdLevelCancelled };
            default: return defaultInfo;
        }
    }, [language, translations]);

    const crowdInfo = useMemo(() => item.crowdLevel ? getCrowdLevelInfo(item.crowdLevel) : null, [item.crowdLevel, getCrowdLevelInfo]);
    const isCancelled = item.crowdLevel?.toLowerCase() === 'geannuleerd' || item.crowdLevel?.toLowerCase() === 'cancelled';
    const isFull = item.crowdLevel?.toLowerCase() === 'vol' || item.crowdLevel?.toLowerCase() === 'full';
    const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;
    
    const translatedGenre = useMemo(() => {
        const genres = (item.genre && item.genre !== 'N/A') ? item.genre.split(',').map(g => g.trim()) : [];
        const subgenres = Array.isArray(item.subgenre) ? item.subgenre : [];
        
        const allTags = [...genres, ...subgenres];
        
        if (allTags.length === 0) return null;
        
        const translated = allTags.map(g => translations[language]?.genres?.[g] || g);
        return translated.join(' / ');
    }, [item.genre, item.subgenre, language, translations]);
    
    const handleShare = async (e, title, url) => {
        e.stopPropagation();
        const shareText = translations[language].common.shareBody.replace('%s', title);
        const shareData = { title, text: shareText, url: url || window.location.href };
        
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return; 
            }
        } catch (error) {
            if (error.name !== 'AbortError') console.warn('navigator.share failed, trying clipboard fallback:', error);
            else return;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareData.url);
                showMessageBox(translations[language].common.shareSuccess);
            } else {
                 throw new Error('Clipboard API not available');
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            showMessageBox(translations[language].common.shareError);
        }
    };
    
    const actionIcons = {
        favorite: { title: favorites.has(item.id) ? translations[language].common.removeFromFavorites : translations[language].common.addToFavorites, className: favorites.has(item.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-400', fill: favorites.has(item.id) ? 'currentColor' : 'none', stroke: 'currentColor', path: <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 22.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /> },
        calendar: { title: translations[language].common.addToGoogleCalendar, className: 'text-gray-500 hover:text-gray-700', fill: 'none', stroke: 'currentColor', path: <g><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></g> },
        share: { title: translations[language].common.sharePerformance, className: 'text-gray-500 hover:text-gray-700', fill: 'none', stroke: 'currentColor', path: <g><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></g> },
    };

    const handleCardClick = () => {
        if (isCancelled || isFull || isExportMode) return;
        if (isNavigable) {
            onNavigate(item);
        } else {
            openContentPopup('performance', item);
        }
    };

    const LocationElement = item.googleMapsUrl ? 'a' : 'div';

    return (
        <div className={`text-gray-800 rounded-xl shadow-xl border border-gray-200 transition-all duration-300 flex flex-col relative w-full md:w-[384px] bg-white overflow-hidden ${isCancelled || isFull ? 'opacity-50' : 'hover:scale-105 hover:shadow-2xl cursor-pointer'}`} onClick={handleCardClick}>
            {translatedGenre && (
                <div className="bg-[#2e9aaa] text-white text-sm md:text-base font-bold uppercase tracking-wider text-center py-1 px-4">
                    {translatedGenre}
                </div>
            )}
            
            <div className="p-4 flex flex-col flex-grow">
                {!hideTime && <p className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{item.time}</p>}
                
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between w-full mb-2">
                    <h2 className="text-lg md:text-xl font-semibold text-[#20747f] mb-1 sm:mb-0 sm:mr-4 flex-grow">{fullTitle}</h2>
                    <LocationElement 
                      href={item.googleMapsUrl || undefined} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={(e) => { if (isExportMode) e.preventDefault(); e.stopPropagation(); }} 
                      className={`flex items-center text-md md:text-lg font-semibold text-gray-600 flex-shrink-0 text-right ${item.googleMapsUrl && !isExportMode ? 'hover:text-[#1a5b64] cursor-pointer' : 'cursor-default'} transition-colors duration-200`} 
                      title={item.googleMapsUrl ? translations[language].common.openLocationInGoogleMaps : ''}
                    >
                        {item.location}
                        {item.googleMapsUrl && (
                            <span className="ml-1 text-[#20747f]">
                                <svg xmlns="https://www.w3.org/24/24" className="h-7 w-7 inline-block" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                                    {item.mapNumber && item.mapNumber !== 'N/A' && (<text x="12" y="10.5" textAnchor="middle" alignmentBaseline="middle" fill="white" fontSize="9" fontWeight="bold">{item.mapNumber}</text>)}
                                </svg>
                            </span>
                        )}
                    </LocationElement>
                </div>

                {item.artistImageUrl && (
                    <div className="my-3 w-full aspect-video rounded-lg overflow-hidden bg-gray-200">
                        <img 
                            src={item.artistImageUrl} 
                            alt={`Afbeelding van ${item.artist}`} 
                            className="w-full h-full object-cover object-top"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                )}
                
                {!hideTime && crowdInfo && (
                  <div className="flex-1 cursor-pointer my-2" onClick={(e) => { e.stopPropagation(); if (!isExportMode) openContentPopup('text', translations[language].crowdMeterInfo); }}>
                    <p className="text-sm font-semibold text-gray-700 mb-1">{translations[language].common.crowdLevel}</p>
                    <div className={`relative w-full h-4 rounded-full ${crowdInfo.barClass}`} onMouseEnter={(e) => handleIconMouseEnter(e, crowdInfo.tooltip)} onMouseLeave={handleIconMouseLeave}>
                        {crowdInfo.fullBar ? (<div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-xs uppercase">{crowdInfo.label}</span></div>)
                        : (<div className="absolute top-0 w-2 h-full rounded-full bg-gray-800" style={{ left: crowdInfo.position, transform: 'translate(-50%, -50%)', top: '50%' }}></div>)}
                    </div>
                  </div>
                )}

                {!isExportMode && (
                    <div className="absolute top-10 right-2 flex flex-row space-x-2 bg-white/50 backdrop-blur-sm p-1 rounded-full">
                        {!hideTime && !isCancelled && !isFull && !isFriendsView && Object.entries(actionIcons).map(([type, icon]) => {
                            if (type === 'read') return null;
                            const clickHandlers = { 
                                favorite: (e) => toggleFavorite(item, e), 
                                calendar: (e) => addToGoogleCalendar(e, fullTitle, item.date, item.time, item.location), 
                                share: (e) => {
                                    // WIJZIGING: Specifieke URL genereren voor direct delen
                                    const slug = slugify(item.artist || item.title);
                                    const shareUrl = `https://www.cafetheaterfestival.nl/${slug}`;
                                    handleShare(e, fullTitle, shareUrl);
                                },
                            };
                            return (
                                <div key={type} className="cursor-pointer" onClick={clickHandlers[type]} title={icon.title}>
                                   <svg xmlns="https://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors duration-200 ${icon.className}`} viewBox="0 0 24 24" fill={icon.fill} stroke={icon.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{icon.path}</svg>
                                </div>
                            );
                        })}
                        {isFriendsView && (
                             <div className="cursor-pointer" onClick={(e) => toggleFavorite(item, e)} title={actionIcons.favorite.title}>
                                 <svg xmlns="https://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors duration-200 ${actionIcons.favorite.className}`} viewBox="0 0 24 24" fill={actionIcons.favorite.fill} stroke={actionIcons.favorite.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{actionIcons.favorite.path}</svg>
                             </div>
                        )}
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row justify-between items-center mt-auto pt-4 border-t border-gray-200 w-full gap-4">
                    <div className="flex flex-row flex-wrap justify-start items-center gap-2">
                        {safetyIcons.map(icon => item.safetyInfo[icon.key] && (<span key={icon.key} className="text-gray-600 flex items-center" onMouseEnter={(e) => handleIconMouseEnter(e, icon.tooltip)} onMouseLeave={handleIconMouseLeave}><img src={icon.url} alt={icon.tooltip} className="h-6 w-auto inline-block"/></span>))}
                    </div>
                    {!isExportMode && (
                        <div className="flex flex-wrap flex-col sm:flex-row gap-2">
                            {item.isCalmRoute && (<button onClick={(e) => { e.stopPropagation(); openContentPopup('calmRouteInfo', translations[language].calmRouteInfo);}} className="px-4 py-2 bg-[#78b5e3] text-black rounded-lg shadow-md hover:bg-[#9f4493] transition-all duration-200 text-sm md:text-base font-semibold text-center">{translations[language].common.calmRoute}</button>)}
                            {item.isReservable && (
                             <button 
                                onClick={(e) => { 
                                e.stopPropagation(); 
                                // Check eerst of de functie wel bestaat voordat we hem aanroepen!
                                if (typeof onReservationClick === 'function') {
                                onReservationClick(item);
                                } else {
                                console.warn('Fout: onReservationClick is niet meegegeven aan PerformanceCard');
                            }
                        }} 
                       className="px-4 py-2 bg-[#9f4493] text-white rounded-lg shadow-md hover:bg-[#7a3471] transition-all duration-200 text-sm md:text-base font-semibold text-center"
                        >
                        {translations[language].common.reserve}
                    </button>
                )}
                            {item.pwycLink && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); if (item.pwycLink) window.open(item.pwycLink, '_blank', 'noopener,noreferrer'); }} 
                                    className="px-4 py-2 bg-[#78b5e3] text-black rounded-lg shadow-md hover:bg-[#9f4493] transition-all duration-200 text-sm md:text-base font-semibold text-center" 
                                    title={translations[language].payWhatYouCan.title}
                                >
                                    {translations[language].payWhatYouCan.title}
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleCardClick(); }} className="px-4 py-2 bg-[#20747f] text-white rounded-lg shadow-md hover:bg-[#1a5b64] transition-all duration-200 text-sm md:text-base">{translations[language].common.moreInfo}</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ========= NIEUW: Aanbevelingskaartje (versimpelde versie) =========
const RecommendationCard = ({ item, subtitle, onClick, language, translations }) => {
    if (!item) return null;
    
    const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;
    
    const translatedGenre = (() => {
        const genres = (item.genre && item.genre !== 'N/A') ? item.genre.split(',').map(g => g.trim()) : [];
        const subgenres = Array.isArray(item.subgenre) ? item.subgenre : [];
        const allTags = [...genres, ...subgenres];
        if (allTags.length === 0) return null;
        const translated = allTags.map(g => translations[language]?.genres?.[g] || g);
        return translated.join(' / ');
    })();

    return (
        <div 
            onClick={onClick} 
            className="bg-white text-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col cursor-pointer transition-transform hover:scale-105 hover:shadow-xl h-full w-full max-w-[280px]"
        >
             <div className="bg-[#20747f] text-white text-xs font-bold py-1 px-3 text-center uppercase tracking-wide">
                 {subtitle}
             </div>
            
             {/* Genre Badge */}
             {translatedGenre && (
                <div className="bg-[#2e9aaa] text-white text-xs font-bold uppercase tracking-wider text-center py-1 px-2">
                    {translatedGenre}
                </div>
            )}

            {/* Afbeelding */}
            {item.artistImageUrl && (
                <div className="w-full h-32 overflow-hidden bg-gray-200">
                    <img 
                        src={item.artistImageUrl} 
                        alt={`Afbeelding van ${item.artist}`} 
                        className="w-full h-full object-cover object-top"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
            )}

            <div className="p-3 flex flex-col flex-grow justify-center text-center">
                 <h3 className="text-sm font-bold text-[#20747f] line-clamp-2 leading-tight">
                     {fullTitle}
                 </h3>
            </div>
        </div>
    );
};


const TimetableDisplay = React.forwardRef(({
  loading, error, displayedData, currentView, favorites, toggleFavorite,
  addToGoogleCalendar, openContentPopup, language, handleIconMouseEnter, handleIconMouseLeave, translations,
  selectedEvent, searchTerm, showMessageBox, selectedDate, safetyIcons, isExportMode = false,
  iconFilters, genreFilters, onNavigate, 
  onReservationClick // <--- 1. Zorg dat deze hier staat
}, ref) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white bg-opacity-20 rounded-xl shadow-lg animate-pulse">
        <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-xl font-semibold">{translations[language].common.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500 bg-opacity-70 text-white p-4 rounded-xl shadow-lg text-center font-semibold max-w-lg">
        <p className="mb-2">{translations[language].common.errorOops}</p>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-red-700 hover:bg-red-800 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
        >
          {translations[language].common.tryAgain}
        </button>
      </div>
    );
  }

  if (displayedData.length === 0) {
    const filtersAreActive = (iconFilters && iconFilters.size > 0) || (genreFilters && genreFilters.size > 0);
    let message;
    if (searchTerm) {
        message = translations[language].common.noSearchResults.replace('%s', `'${searchTerm}'`);
    } else if (currentView === 'favorites') {
        message = translations[language].common.noFavoritesFound;
    } else if (currentView === 'friends-favorites') {
        message = translations[language].common.noFriendsFavoritesFound;
    } else if (filtersAreActive) {
        message = translations[language].common.noFilterResultsForEvent;
    } else {
        message = translations[language].common.noDataFound.replace('%s', (selectedEvent || ''));
    }

    return (
      <div className="bg-white bg-opacity-20 p-6 rounded-xl shadow-lg text-center font-semibold">
        <p>{message}</p>
      </div>
    );
  }

  const isAllPerformancesView = selectedDate === 'all-performances';
  const isFriendsView = currentView === 'friends-favorites';

  return (
    <div ref={ref} className="w-full max-w-6xl mx-auto">
      {displayedData.map((group, index) => (
        <div key={index} className="mb-8">
          {group.groupTitle && (
            <h2 className="text-2xl font-bold text-white mb-6 text-center drop_shadow-lg">
              {group.groupTitle}
            </h2>
          )}
          {group.subGroups.map((subGroup, subIndex) => (
            <div key={subIndex} className="mb-8 last:mb-0">
              {subGroup.subGroupTitle && (
                <h2 className="text-xl font-semibold text-white mb-4 text-center drop_shadow">
                  {subGroup.subGroupTitle}
                </h2>
              )}
              <div
                className={`grid grid-cols-1 md:grid-cols-2 ${
                  subGroup.items.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
                } gap-6 justify-items-center justify-center`}
              >
                {subGroup.items.map((item) => (
                  <PerformanceCard
                    key={item.id}
                    item={item}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    addToGoogleCalendar={addToGoogleCalendar}
                    openContentPopup={openContentPopup}
                    language={language}
                    handleIconMouseEnter={handleIconMouseEnter}
                    handleIconMouseLeave={handleIconMouseLeave}
                    translations={translations}
                    showMessageBox={showMessageBox}
                    safetyIcons={safetyIcons}
                    hideTime={isAllPerformancesView}
                    isExportMode={isExportMode}
                    isFriendsView={isFriendsView}
                    onNavigate={onNavigate}
                    isNavigable={isAllPerformancesView}
                    onReservationClick={onReservationClick} // <--- 2. Zorg dat hij hier wordt doorgegeven
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});


const BlockTimetable = React.forwardRef(({ allData, favorites, toggleFavorite, selectedEvent, openContentPopup, translations, language, isFavoritesView = false, isFriendsView = false, friendsFavorites = new Set(), isExportMode = false }, ref) => {
    const [selectedDay, setSelectedDay] = useState(null);

    const sourceData = useMemo(() => {
        if (isFavoritesView) return allData.filter(p => favorites.has(p.id));
        if (isFriendsView) return allData.filter(p => friendsFavorites.has(p.id));
        return allData;
    }, [isFavoritesView, isFriendsView, allData, favorites, friendsFavorites]);

    const eventPerformances = useMemo(() => 
        (isFavoritesView || isFriendsView) ? sourceData : sourceData.filter(p => p.event === selectedEvent), 
        [isFavoritesView, isFriendsView, sourceData, selectedEvent]
    );

    const availableDays = useMemo(() => 
        [...new Set(eventPerformances.map(p => p.date).filter(Boolean))]
        .sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b)), 
        [eventPerformances]
    );

    useEffect(() => {
        if (!availableDays.includes(selectedDay)) {
            setSelectedDay(availableDays[0] || null);
        }
    }, [selectedEvent, availableDays, selectedDay, isFavoritesView, isFriendsView]);

    const gridData = useMemo(() => {
        if (!selectedDay) return { locations: [], timeSlots: [], grid: {} };
        
        const dayPerformances = eventPerformances.filter(p => p.date === selectedDay);
        if (dayPerformances.length === 0) return { locations: [], timeSlots: [], grid: {} };

        const locations = [...new Set(dayPerformances.map(p => p.location).filter(Boolean))].sort();

        let minTime = 23.5, maxTime = 0;
        dayPerformances.forEach(p => {
            if (!p.time) return;
            const [h, m] = p.time.split(':').map(Number);
            const timeVal = h + m / 60;
            if (timeVal < minTime) minTime = timeVal;
            if (timeVal > maxTime) maxTime = timeVal;
        });

        const startTime = Math.floor(minTime);
        const endTime = Math.ceil(maxTime) + 1;
        const timeSlots = [];
        for (let h = startTime; h < endTime; h++) {
            timeSlots.push(`${String(h).padStart(2, '0')}:00`);
            timeSlots.push(`${String(h).padStart(2, '0')}:30`);
        }

        const grid = {};
        locations.forEach(loc => {
            grid[loc] = {};
            timeSlots.forEach(slot => { grid[loc][slot] = null; });
        });

        dayPerformances.forEach(p => {
            if (grid[p.location] && p.time) {
                const [h, m] = p.time.split(':').map(Number);
                const timeSlot = `${String(h).padStart(2, '0')}:${m < 30 ? '00' : '30'}`;
                if (grid[p.location][timeSlot] === null) {
                    grid[p.location][timeSlot] = p;
                }
            }
        });
        
        return { locations, timeSlots, grid };
    }, [selectedDay, eventPerformances]);
    
    if (!isFavoritesView && !isFriendsView && !selectedEvent) {
        return <div className="text-center text-white p-4">{translations[language].common.chooseCity}</div>
    }

    const renderCell = (performance) => {
        if (!performance) return null;

        const isCancelled = performance.crowdLevel?.toLowerCase() === 'geannuleerd' || performance.crowdLevel?.toLowerCase() === 'cancelled';
        const isFull = performance.crowdLevel?.toLowerCase() === 'vol' || performance.crowdLevel?.toLowerCase() === 'full';
        const isFavorite = favorites.has(performance.id);
        const fullTitle = performance.artist ? `${performance.artist} - ${performance.title}` : performance.title;

        let cellBgClass = isExportMode ? 'bg-[#2e9aaa]' : 'bg-[#1a5b64] hover:bg-[#2e9aaa]';
        let content = <>{fullTitle}</>;

        if (isCancelled) {
            cellBgClass = 'bg-gray-500 opacity-80';
            content = (
                <>
                    <span className="line-through">{fullTitle}</span>
                    <span className="block text-xs font-bold mt-1">{translations[language].common.geannuleerd}</span>
                </>
            );
        } else if (isFull) {
            cellBgClass = 'bg-red-500';
            content = (
                <>
                    <span>{fullTitle}</span>
                    <span className="block text-xs font-bold mt-1">{translations[language].common.vol}</span>
                </>
            );
        }
        
        return (
            <div 
                onClick={() => !isCancelled && !isExportMode && openContentPopup('performance', performance)}
                className={`relative text-white text-xs p-2 rounded-md w-full h-full flex flex-col items-center justify-center text-center transition-colors ${!isCancelled && !isExportMode ? 'cursor-pointer' : ''} ${cellBgClass}`}
            >
                <div className="w-full pr-6">
                    {content}
                </div>
                {!isCancelled && !isFriendsView && (
                    <div
                        onClick={(e) => { if (!isExportMode) { e.stopPropagation(); toggleFavorite(performance, e); } }}
                        className={`absolute top-1 right-1 p-1 ${!isExportMode ? 'cursor-pointer' : 'pointer-events-none'}`}
                        title={!isExportMode ? (isFavorite ? translations[language].common.removeFromFavorites : translations[language].common.addToFavorites) : ''}
                    >
                        <svg xmlns="https://www.w3.org/2000/svg" className={`h-5 w-5 ${isFavorite ? 'text-red-500' : 'text-white/70'}`} viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 22.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                )}
            </div>
        );
    };

    const getEmptyMessage = () => {
      if (isFavoritesView) return translations[language].common.noFavoritesFound;
      if (isFriendsView) return translations[language].common.noFriendsFavoritesFound;
      return translations[language].common.noDataFound.replace('%s', selectedEvent);
    }
    
    const headerBaseClasses = "p-2 font-bold bg-[#20747f] z-10";
    const timeHeaderClasses = `${headerBaseClasses} text-center border-b border-white/20 ${!isExportMode ? 'sticky top-0' : ''}`;
    const locationHeaderClasses = `${headerBaseClasses} text-right pr-2 border-r border-white/20 flex items-center justify-end ${!isExportMode ? 'sticky left-0' : ''}`;
    const cornerCellClasses = `${headerBaseClasses} ${!isExportMode ? 'sticky top-0 left-0' : ''} z-20`;

    return (
        <div ref={ref} className="w-full text-white">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-8 p-3 bg-white bg-opacity-20 rounded-xl shadow-lg max-w-full overflow-x-auto scrollbar-hide">
                {availableDays.length > 0 ? availableDays.map(day => (
                    <button 
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDay === day ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}
                    >
                        {day}
                    </button>
                )) : <p>{getEmptyMessage()}</p>}
            </div>
            
            <div className={`transition-opacity duration-300 ${!selectedDay ? 'opacity-0' : 'opacity-100'}`}>
                {availableDays.length > 0 && selectedDay && (
                    <div className={`overflow-x-auto ${isExportMode ? 'bg-[#20747f]' : 'bg-black bg-opacity-20'} p-4 rounded-lg`}>
                        <div className="inline-grid gap-px" style={{ gridTemplateColumns: `100px repeat(${gridData.timeSlots.length}, 120px)` }}>
                            <div className={cornerCellClasses}></div> 
                            {gridData.timeSlots.map(time => (
                                <div key={time} className={timeHeaderClasses}>
                                    {time}
                                </div>
                            ))}
                            {gridData.locations.map((loc, locIndex) => (
                                <React.Fragment key={loc}>
                                    <div className={locationHeaderClasses} style={{ gridRow: locIndex + 2 }}>
                                        <span>{loc}</span>
                                    </div>
                                    {gridData.timeSlots.map(time => {
                                        const performance = gridData.grid[loc]?.[time];
                                        return (
                                            <div key={`${loc}-${time}`} className="border-r border-b border-white/10 p-1 min-h-[60px] flex items-center justify-center">
                                                {renderCell(performance)}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});


const ZoomableImage = ({ src, alt }) => {
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const imageRef = useRef(null);
    const containerRef = useRef(null);
    const isPinching = useRef(false);
    const lastPinchDist = useRef(0);
    const isDragging = useRef(false);
    const lastDragPos = useRef({ x: 0, y: 0 });

    const updateTransform = (newTransform, { clamp = true } = {}) => {
        setTransform(prev => {
            let { scale, x, y } = { ...prev, ...newTransform };
            
            if (clamp) {
                scale = Math.max(1, Math.min(scale, 5));
                
                if (scale === 1) {
                    x = 0;
                    y = 0;
                } else {
                    const imageEl = imageRef.current;
                    const containerEl = containerRef.current;
                    if (imageEl && containerEl) {
                        const max_x = (imageEl.offsetWidth * scale - containerEl.clientWidth) / 2;
                        const max_y = (imageEl.offsetHeight * scale - containerEl.clientHeight) / 2;
                        x = Math.max(-max_x, Math.min(x, max_x));
                        y = Math.max(-max_y, Math.min(y, max_y));
                    }
                }
            }
            return { scale, x, y };
        });
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const scaleDelta = e.deltaY * -0.01;
        updateTransform({ scale: transform.scale + scaleDelta });
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        isDragging.current = true;
        lastDragPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        const dx = e.clientX - lastDragPos.current.x;
        const dy = e.clientY - lastDragPos.current.y;
        lastDragPos.current = { x: e.clientX, y: e.clientY };
        updateTransform({ x: transform.x + dx, y: transform.y + dy });
    };

    const handleMouseUp = () => isDragging.current = false;

    const getDistance = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            isPinching.current = true;
            lastPinchDist.current = getDistance(e.touches);
        } else if (e.touches.length === 1) {
            e.preventDefault();
            isDragging.current = true;
            lastDragPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchMove = (e) => {
        if (isPinching.current && e.touches.length === 2) {
            e.preventDefault();
            const newDist = getDistance(e.touches);
            const scaleDelta = (newDist - lastPinchDist.current) * 0.01;
            lastPinchDist.current = newDist;
            updateTransform({ scale: transform.scale + scaleDelta });
        } else if (isDragging.current && e.touches.length === 1) {
            e.preventDefault();
            const dx = e.touches[0].clientX - lastDragPos.current.x;
            const dy = e.clientY - lastDragPos.current.y;
            lastDragPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            updateTransform({ x: transform.x + dx, y: transform.y + dy });
        }
    };

    const handleTouchEnd = () => {
        isPinching.current = false;
        isDragging.current = false;
    };
    
    const handleDoubleClick = () => {
        updateTransform({ scale: transform.scale > 1 ? 1 : 2 });
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
        >
            <img
                ref={imageRef}
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out"
                style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
            />
        </div>
    );
};


// ========= NIEUW: Nieuwsbrief Component =========
const NewsletterForm = ({ language }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        // Voorkom dubbele scripts als het component opnieuw rendert
        if (containerRef.current && containerRef.current.querySelector('script')) return;

        const script = document.createElement('script');
        script.src = "https://eocampaign1.com/form/3a755ba2-da27-11ef-bbaf-4f7a9e336f89.js";
        script.async = true;
        script.setAttribute('data-form', '3a755ba2-da27-11ef-bbaf-4f7a9e336f89');
        
        if (containerRef.current) {
            containerRef.current.appendChild(script);
        }

        return () => {
            // Cleanup bij unmount om te zorgen dat scripts niet blijven hangen
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, []);

    return (
        <div className="w-full text-left px-0 md:px-4">
            <h1 className="font-bold text-lg mb-2 text-[#78b5e3]">
                {language === 'nl' ? 'Blijf op de hoogte' : 'Stay updated'}
            </h1>
            <p className="text-sm text-gray-300 mb-4">
                {language === 'nl' 
                    ? 'Schrijf je in voor de nieuwsbrief en mis niets van het festival.' 
                    : 'Subscribe to our newsletter and don\'t miss a thing.'}
            </p>
            {/* De 'min-h' zorgt dat de layout niet verspringt tijdens het laden van het externe formulier */}
            <div ref={containerRef} className="min-h-[120px] w-full bg-white bg-opacity-5 rounded-lg p-2"></div>
        </div>
    );
};


// ========= WIJZIGING: PerformanceDetailPage aangepast voor locati-iconen en event-link =========
const PerformanceDetailPage = ({ performance, allPerformances, language, translations, onNavigateToEvent, onReservationClick }) => {
    const item = performance;
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const safetyIcons = useMemo(() => getSafetyIcons(translations, language), [language, translations]);

    const title = item.artist ? `${item.artist} - ${item.title}` : item.title;
    // AANGEPAST: Credits afhankelijk van taal
    const credits = language === 'nl' ? item.marketingCredits : (item.marketingCreditsENG || item.marketingCredits);
    const textAboutPerformance = language === 'nl' ? item.marketingVoorstellingNL : item.marketingVoorstellingENG;
    const textAboutMakers = language === 'nl' ? item.marketingBioNL : item.marketingBioENG;
    // AANGEPAST: Detailpagina gebruikt Afbeelding1
    const image1 = item.marketingAfbeelding1;
    
    // Selecteer random figuren, gebaseerd op performance ID voor consistentie
    const [leftFig, rightFig] = useMemo(() => getRandomFigures(item.id), [item.id]);
    
    const translatedGenre = useMemo(() => {
        const genres = (item.genre && item.genre !== 'N/A') ? item.genre.split(',').map(g => g.trim()) : [];
        const subgenres = Array.isArray(item.subgenre) ? item.subgenre : [];
        
        const allTags = [...genres, ...subgenres];
        
        if (allTags.length === 0) return null;
        
        const translated = allTags.map(g => translations[language]?.genres?.[g] || g);
        return translated.join(' / ');
    }, [item.genre, item.subgenre, language, translations]);

    const performanceOccurrences = useMemo(() => {
        return allPerformances
            .filter(p => p.artist === item.artist && p.title === item.title)
            .sort((a, b) => {
                const dateA = parseDateForSorting(a.date);
                const dateB = parseDateForSorting(b.date);
                if (dateA - dateB !== 0) return dateA - dateB;
                return a.time.localeCompare(b.time);
            });
    }, [allPerformances, item.artist, item.title]);

    const renderTextWithLineBreaks = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, index) => (
            <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: applyFormatting(line) }}></p>
        ));
    };

    const diningIcon = safetyIcons.find(i => i.key === 'diningFacility');
    const wheelchairIcon = safetyIcons.find(i => i.key === 'wheelchairAccessible');

    return (
        <div className="relative px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-32 sm:pt-28 text-white">
            {/* Decoratieve Figuren - AANGEPAST: Nu zichtbaar vanaf LG (laptop) en 50% kleiner (w-24) */}
            <img 
                src={leftFig} 
                className="hidden md:block absolute left-8 top-32 w-24 opacity-90 pointer-events-none drop-shadow-xl" 
                alt="Decoratief figuur links" 
            />
            <img 
                src={rightFig} 
                className="hidden md:block absolute right-8 top-48 w-24 opacity-90 pointer-events-none drop-shadow-xl" 
                alt="Decoratief figuur rechts" 
            />

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-center">{title}</h2>
            
            <div className="max-w-4xl mx-auto my-6 p-4 bg-[#78b5e3] rounded-lg text-black">
                <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                >
                    <h3 className="text-xl font-semibold">{translations[language].common.performanceSchedule}</h3>
                    <svg className={`w-6 h-6 transition-transform duration-300 ${isScheduleOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="https://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                {isScheduleOpen && (
                    <ul className="space-y-2 mt-4 animate-fade-in">
                        {performanceOccurrences.map(occ => (
                            <li key={occ.id} className="flex flex-wrap justify-between items-center text-lg gap-x-4 gap-y-1">
                                <div className="flex-1 min-w-[150px]">
                                    <button onClick={() => onNavigateToEvent('timetable', occ.event)} className="underline hover:text-blue-200 text-left font-semibold">{occ.event}</button>
                                </div>
                                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                                    <span>{occ.location}</span>
                                    {occ.safetyInfo?.diningFacility && diningIcon && (
                                        <img src={diningIcon.url} alt={diningIcon.label} title={diningIcon.tooltip} className="h-6 w-auto"/>
                                    )}
                                    {occ.safetyInfo?.wheelchairAccessible && wheelchairIcon && (
                                        <img src={wheelchairIcon.url} alt={wheelchairIcon.label} title={wheelchairIcon.tooltip} className="h-6 w-auto"/>
                                    )}
                                </div>
                                <div className="flex-1 text-right min-w-[150px] flex items-center justify-end gap-3">
                                    <span>{occ.date} - {occ.time}</span>
                                    {occ.isReservable && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onReservationClick(occ); }}
                                            className="px-3 py-1 bg-[#9f4493] text-white rounded shadow-md hover:bg-[#7a3471] text-sm font-semibold transition-colors"
                                        >
                                            {translations[language].common.reserve}
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 my-8 max-w-6xl mx-auto">
                <div className="md:w-1/3 text-left md:text-right">
                    {/* AANGEPAST: Gebruik vertaling voor titel */}
                    <h3 className="text-xl md:text-2xl font-semibold mb-3 border-b-2 border-white/50 pb-2">{translations[language].common.aboutShow}</h3>
                    <div className="prose prose-invert max-w-none md:prose-lg">
                        {renderTextWithLineBreaks(textAboutPerformance)}
                    </div>
                </div>
                {image1 && (
                    <div className="md:w-1/3">
                        <img src={image1} alt={`Afbeelding van ${title}`} className="rounded-lg shadow-lg w-full h-auto object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                )}
                <div className="md:w-1/3 text-left">
                     {/* AANGEPAST: Gebruik vertaling voor titel */}
                     <h3 className="text-xl md:text-2xl font-semibold mb-3 border-b-2 border-white/50 pb-2">{translations[language].common.aboutCreators}</h3>
                    <div className="prose prose-invert max-w-none md:prose-lg">
                        {renderTextWithLineBreaks(textAboutMakers)}
                    </div>
                </div>
            </div>
            
            <div className="max-w-2xl mx-auto my-6 p-4 bg-[#78b5e3] rounded-lg text-black">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {translatedGenre && <h3 className="text-lg"><span className="font-bold">Genre:</span> {translatedGenre}</h3>}
                    <div className="flex flex-row flex-wrap justify-center items-center gap-3">
                        {safetyIcons.map(icon => item.safetyInfo[icon.key] && (
                            <img key={icon.key} src={icon.url} alt={icon.label} title={icon.tooltip} className="h-8 w-auto"/>
                        ))}
                    </div>
                </div>
            </div>

            {credits && (
                <div className="mt-8 pt-4 border-t border-white/30 max-w-4xl mx-auto">
                    <p className="text-center text-gray-300 md:text-lg italic">
                        {credits}
                    </p>
                </div>
            )}
        </div>
    );
};

// ========= NIEUW: InfoDetailPage component voor volledige pagina weergave van info/toegankelijkheid =========
const InfoDetailPage = ({ item, language, translations }) => {
    const itemTitle = item.title[language] || item.title.nl;
    const itemText = item.tekst?.[language] || item.tekst?.nl;
    const itemUrl = item.url?.[language] || item.url?.nl;

    return (
        <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-32 sm:pt-28 text-white min-h-screen">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-center">{itemTitle}</h2>
            <div className="max-w-4xl mx-auto bg-black bg-opacity-30 p-6 rounded-lg">
                {item.weergave && itemText ? (
                     <CustomTextRenderer 
                        text={itemText} 
                        imageUrl={item.imageUrl}
                        title={itemTitle}
                        textColorClass="text-gray-200"
                    />
                ) : (
                    <iframe
                        src={itemUrl}
                        title={itemTitle}
                        className="w-full h-[80vh] border-0 rounded-lg"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                )}
            </div>
        </div>
    );
};

const PerformanceDetailPopup = ({ item, language, translations, allPerformances, openContentPopup, onReservationClick }) => {
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const safetyIcons = useMemo(() => getSafetyIcons(translations, language), [language, translations]);

    const title = item.artist ? `${item.artist} - ${item.title}` : item.title;
    // AANGEPAST: Credits afhankelijk van taal
    const credits = language === 'nl' ? item.marketingCredits : (item.marketingCreditsENG || item.marketingCredits);
    const textAboutPerformance = language === 'nl' ? item.marketingVoorstellingNL : item.marketingVoorstellingENG;
    const textAboutMakers = language === 'nl' ? item.marketingBioNL : item.marketingBioENG;
    // AANGEPAST: Popup gebruikt Afbeelding1
    const image1 = item.marketingAfbeelding1;

    const translatedGenre = useMemo(() => {
        const genres = (item.genre && item.genre !== 'N/A') ? item.genre.split(',').map(g => g.trim()) : [];
        const subgenres = Array.isArray(item.subgenre) ? item.subgenre : [];
        
        const allTags = [...genres, ...subgenres];
        
        if (allTags.length === 0) return null;
        
        const translated = allTags.map(g => translations[language]?.genres?.[g] || g);
        return translated.join(' / ');
    }, [item.genre, item.subgenre, language, translations]);

    const performanceOccurrences = useMemo(() => {
        return allPerformances
            .filter(p => p.artist === item.artist && p.title === item.title)
            .sort((a, b) => {
                const dateA = parseDateForSorting(a.date);
                const dateB = parseDateForSorting(b.date);
                if (dateA - dateB !== 0) return dateA - dateB;
                return a.time.localeCompare(b.time);
            });
    }, [allPerformances, item.artist, item.title]);

    const renderTextWithLineBreaks = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, index) => (
            <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: applyFormatting(line) }}></p>
        ));
    };

    // ========= LOGICA AANBEVELINGEN =========
    // Helper: vind een performance in allPerformances op basis van PerformanceID (niet execution ID) en EventNaam
    const findPerformance = useCallback((performanceId, eventName) => {
        // We zoeken de eerste execution van de performance in het juiste event
        // performanceId is de ID van de 'Performance' collectie, niet de 'Execution' ID
        // allParsedData bevat 'originalPerformanceId' veld
        return allPerformances.find(p => p.originalPerformanceId === performanceId && p.event === eventName);
    }, [allPerformances]);

    // 1. Iets wat hierop lijkt
    const similarItem = useMemo(() => {
        if (!item.similarRaw || !item.eventId) return null;
        // Format in Appwrite: "EventID|PerformanceID"
        // We zoeken de string die de huidige EventID bevat
        const matchString = item.similarRaw.find(str => str.includes(item.eventId));
        if (!matchString) return null;
        
        // FIX: Check op '|' (pipe) omdat dit in Appwrite wordt gebruikt
        let targetPerformanceId;
        if (matchString.includes('|')) {
             targetPerformanceId = matchString.split('|')[1];
        } else if (matchString.includes(':')) {
             targetPerformanceId = matchString.split(':')[1]; // Fallback voor oude data
        } else {
             targetPerformanceId = matchString;
        }
        
        return findPerformance(targetPerformanceId ? targetPerformanceId.trim() : null, item.event);
    }, [item.similarRaw, item.eventId, item.event, findPerformance]);

    // 2. Iets totaal anders
    const differentItem = useMemo(() => {
        if (!item.differentRaw || !item.eventId) return null;
        const matchString = item.differentRaw.find(str => str.includes(item.eventId));
        if (!matchString) return null;
        
        // FIX: Check op '|' (pipe)
        let targetPerformanceId;
        if (matchString.includes('|')) {
             targetPerformanceId = matchString.split('|')[1];
        } else if (matchString.includes(':')) {
             targetPerformanceId = matchString.split(':')[1];
        } else {
             targetPerformanceId = matchString;
        }
        
        return findPerformance(targetPerformanceId ? targetPerformanceId.trim() : null, item.event);
    }, [item.differentRaw, item.eventId, item.event, findPerformance]);

    // 3. Iets in de buurt
    const nearbyItem = useMemo(() => {
        if (!item.nearbyLocationId) return null;
        // Zoek een andere performance op dezelfde locatie in hetzelfde event
        // Filter de huidige performance eruit (op basis van titel/artiest om dubbelingen met andere tijden te voorkomen, of gewoon ID)
        return allPerformances.find(p => 
            p.locationId === item.nearbyLocationId && 
            p.event === item.event && 
            p.originalPerformanceId !== item.originalPerformanceId
        );
    }, [item.nearbyLocationId, item.event, item.originalPerformanceId, allPerformances]);


    return (
        <div className="overflow-y-auto flex-grow p-4 sm:p-6 text-white">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center">{title}</h2>
            
            <div className="max-w-2xl mx-auto my-4 p-3 bg-[#78b5e3] rounded-lg text-black">
                <div 
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                >
                    <h3 className="text-lg font-semibold">{translations[language].common.performanceSchedule}</h3>
                    <svg className={`w-5 h-5 transition-transform duration-300 ${isScheduleOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                {isScheduleOpen && (
                    <ul className="space-y-1 mt-3 animate-fade-in">
                        {performanceOccurrences.map(occ => (
                            <li key={occ.id} className="flex flex-wrap justify-between items-center text-base py-1">
                                <span>{occ.event} - {occ.location}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-right">{occ.date} - {occ.time}</span>
                                    {occ.isReservable && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onReservationClick(occ); }}
                                            className="px-2 py-1 bg-[#9f4493] text-white rounded shadow-md hover:bg-[#7a3471] text-xs font-semibold transition-colors"
                                        >
                                            {translations[language].common.reserve}
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 my-6 max-w-5xl mx-auto">
                <div className="md:w-1/3 text-left md:text-right">
                    <h3 className="text-xl font-semibold mb-2 border-b-2 border-white/50 pb-1">{translations[language].common.aboutShow}</h3>
                    <div className="prose prose-sm prose-invert max-w-none">
                        {renderTextWithLineBreaks(textAboutPerformance)}
                    </div>
                </div>
                {image1 && (
                    <div className="md:w-1/3">
                        <img src={image1} alt={`Afbeelding van ${title}`} className="rounded-lg shadow-lg w-full h-auto object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                )}
                <div className="md:w-1/3 text-left">
                     <h3 className="text-xl font-semibold mb-2 border-b-2 border-white/50 pb-1">{translations[language].common.aboutCreators}</h3>
                    <div className="prose prose-sm prose-invert max-w-none">
                        {renderTextWithLineBreaks(textAboutMakers)}
                    </div>
                </div>
            </div>
            
            <div className="max-w-2xl mx-auto my-4 p-3 bg-[#78b5e3] rounded-lg text-black">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    {translatedGenre && <h3 className="text-base"><span className="font-bold">Genre:</span> {translatedGenre}</h3>}
                    <div className="flex flex-row flex-wrap justify-center items-center gap-2">
                        {safetyIcons.map(icon => item.safetyInfo[icon.key] && (
                            <img key={icon.key} src={icon.url} alt={icon.label} title={icon.tooltip} className="h-7 w-auto"/>
                        ))}
                    </div>
                </div>
            </div>

            {credits && (
                <div className="mt-6 pt-3 border-t border-white/30 max-w-3xl mx-auto mb-8">
                    <p className="text-center text-gray-300 text-sm italic">
                        {credits}
                    </p>
                </div>
            )}

            {/* ========= AANBEVELINGEN SECTIE ========= */}
            {(similarItem || differentItem || nearbyItem) && (
                <div className="mt-12 mb-6 border-t border-white/20 pt-8">
                    <h3 className="text-2xl font-bold text-center mb-6">{translations[language].common.seeSomethingElse}</h3>
                    <div className="flex flex-wrap justify-center gap-6">
                        {similarItem && (
                            <RecommendationCard 
                                item={similarItem} 
                                subtitle={translations[language].common.similarShow}
                                onClick={(e) => {
                                    e.stopPropagation(); // Voorkom dat andere kliks worden getriggerd
                                    openContentPopup('performance', similarItem);
                                    // FIX: Scroll de popup direct weer naar boven
                                    const modalElement = document.querySelector('[role="dialog"]');
                                    if (modalElement) modalElement.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                language={language}
                                translations={translations}
                            />
                        )}
                        {differentItem && (
                            <RecommendationCard 
                                item={differentItem} 
                                subtitle={translations[language].common.differentShow}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openContentPopup('performance', differentItem);
                                    // FIX: Scroll de popup direct weer naar boven
                                    const modalElement = document.querySelector('[role="dialog"]');
                                    if (modalElement) modalElement.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                language={language}
                                translations={translations}
                            />
                        )}
                        {nearbyItem && (
                            <RecommendationCard 
                                item={nearbyItem} 
                                subtitle={translations[language].common.nearbyShow}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openContentPopup('performance', nearbyItem);
                                    // FIX: Scroll de popup direct weer naar boven
                                    const modalElement = document.querySelector('[role="dialog"]');
                                    if (modalElement) modalElement.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                language={language}
                                translations={translations}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const PopupModal = ({ showPopup, closePopup, popupContent, language, translations, allPerformances, openContentPopup, onReservationClick }) => {
  const modalRef = useRef(null);
  const iframeRef = useRef(null);
  // NIEUW: State voor de geheime code
  const [secretCode, setSecretCode] = useState('');

  const [leftFig, rightFig] = useMemo(() => {
    if (!popupContent || !popupContent.data) return [null, null];
    const seed = popupContent.data.id || popupContent.data.title || 'random-popup';
    return getRandomFigures(seed);
  }, [popupContent]);
  
  // NIEUW: Reset de code als de popup opent
  useEffect(() => {
      if (showPopup) {
          setSecretCode('');
      }
  }, [showPopup]);

  useEffect(() => {
    if (showPopup) {
      const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const firstElement = focusableElements?.[0];
      const lastElement = focusableElements?.[focusableElements.length - 1];
      const previousActiveElement = document.activeElement;
      modalRef.current?.focus();
      const handleKeyDown = (event) => {
        if (event.key === 'Escape') { closePopup(); return; }
        if (event.key === 'Tab' && firstElement && lastElement) { if (event.shiftKey) { if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); } } else { if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); } } }
      };
      const currentModal = modalRef.current;
      currentModal?.addEventListener('keydown', handleKeyDown);
      return () => { currentModal?.removeEventListener('keydown', handleKeyDown); previousActiveElement?.focus(); };
    }
  }, [showPopup, closePopup, popupContent]);
  
  if (!showPopup) return null;

  const renderContent = () => {
    if (!popupContent || !popupContent.type) return <p className="text-white">{translations[language].common.noContentAvailable}</p>;

    switch (popupContent.type) {
            case 'helpChoosingEventSelection':
        return (
            <div className="overflow-y-auto flex-grow p-6 flex flex-col items-center justify-center min-h-[50vh]">
                <h2 className="text-3xl font-bold mb-8 text-white text-center">{translations[language].common.chooseEvent}</h2>
                <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl">
                    {popupContent.data.events.map((eventName, index) => (
                        <button 
                            key={index}
                            onClick={() => popupContent.data.onSelectEvent(eventName)}
                            className="bg-white text-[#20747f] hover:bg-[#9f4493] hover:text-black font-bold text-xl py-6 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-2xl min-w-[200px]"
                        >
                            {eventName}
                        </button>
                    ))}
                </div>
            </div>
        );      
      case 'routeDateSelection':
        return (
            <div className="overflow-y-auto flex-grow p-6 flex flex-col items-center justify-center min-h-[50vh]">
                <h2 className="text-3xl font-bold mb-8 text-white text-center">{translations[language].common.chooseDate}</h2>
                <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl">
                    {popupContent.data.dates.map((date, index) => {
                        // Formatteer datum voor weergave (dd-mm-yyyy)
                        const dateObj = parseDateForSorting(date);
                        const displayDate = !isNaN(dateObj.getTime()) 
                            ? dateObj.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                            : date;

                        return (
                            <button 
                                key={index}
                                onClick={() => popupContent.data.onSelectDate(date)}
                                className="bg-white text-[#20747f] hover:bg-[#78b5e3] hover:text-black font-bold text-xl py-6 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-2xl min-w-[200px]"
                            >
                                {displayDate}
                            </button>
                        );
                    })}
                </div>
            </div>
        );

      case 'routeSelection':
         // NIEUW: Filter routes op basis van geheime code
         const visibleRoutes = popupContent.data.routes.filter(route => {
             // Als er geen code is, is het openbaar -> toon
             if (!route.code) return true;
             // Als er wel een code is, moet deze matchen met de invoer (case-insensitive)
             return route.code.trim().toLowerCase() === secretCode.trim().toLowerCase();
         });

         // NIEUW: Grid voor routes in popup (GECORRIGEERD NAAR 3 KOLOMMEN OP GROOT SCHERM)
         return (
            <div className="overflow-y-auto flex-grow p-6">
                {/* Header met titel en invoerveld */}
                <div className="relative mb-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                    <h2 className="text-3xl font-bold text-white text-center sm:absolute sm:left-1/2 sm:-translate-x-1/2">{translations[language].common.routes}</h2>
                    <div className="sm:absolute sm:right-0 z-10">
                        <input 
                            type="text" 
                            value={secretCode}
                            onChange={(e) => setSecretCode(e.target.value)}
                            placeholder={language === 'nl' ? "Geheime code?" : "Secret code?"}
                            className="px-3 py-2 rounded-lg text-black text-sm bg-white/90 focus:bg-white focus:ring-2 focus:ring-[#78b5e3] outline-none shadow-inner w-40 transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                    {visibleRoutes.length === 0 ? (
                        <div className="col-span-full text-center text-white/70 italic mt-8">
                            {language === 'nl' ? "Geen routes gevonden..." : "No routes found..."}
                        </div>
                    ) : (
                    visibleRoutes.map((route, index) => {
                        // 1. Haal de voorstellingen op die bij deze route horen
                        const routePerformances = allPerformances.filter(p => route.executionIds && route.executionIds.includes(p.id));
                        
                        // 2. Bepaal aantal voorstellingen
                        const performanceCount = routePerformances.length;

                        // 3. Bepaal genres (uniek)
                        const uniqueGenres = [...new Set(routePerformances.flatMap(p => 
                            (p.genre && p.genre !== 'N/A') ? p.genre.split(',').map(g => g.trim()) : []
                        ))];
                        const displayGenres = uniqueGenres.map(g => translations[language]?.genres?.[g] || g).join(', ');

                        // 4. Bepaal tijden per datum
                        const performancesByDate = routePerformances.reduce((acc, p) => {
                            if (!acc[p.date]) acc[p.date] = [];
                            acc[p.date].push(p.time);
                            return acc;
                        }, {});

                        // Sorteer datums
                        const sortedDates = Object.keys(performancesByDate).sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));

                        return (
                            <div 
                                key={index}
                                className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full max-w-sm flex flex-col"
                                onClick={() => popupContent.data.onSelectRoute(route)}
                            >
                                <img 
                                    src={route.image} 
                                    alt={language === 'nl' ? route.title : (route.titleEng || route.title)} 
                                    className="w-full h-48 object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <div className="p-4 flex-grow flex flex-col">
                                    <h3 className="text-xl font-bold text-[#20747f] mb-2">
                                        {language === 'nl' ? route.title : (route.titleEng || route.title)}
                                    </h3>
                                    
                                    {/* Route Info Sectie - Icoontjes verwijderd */}
                                    <div className="mb-3 text-sm text-gray-600 space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        {/* Aantal voorstellingen */}
                                        <div className="flex items-center">
                                            <span className="font-semibold">{performanceCount} voorstellingen</span>
                                        </div>

                                        {/* Genres */}
                                        {displayGenres && (
                                            <div className="flex items-start">
                                                <span className="italic leading-tight">{displayGenres}</span>
                                            </div>
                                        )}

                                        {/* Tijden */}
                                        {sortedDates.length > 0 && (
                                            <div className="flex items-start pt-1 mt-1 border-t border-gray-200">
                                                <div className="flex flex-col">
                                                    {sortedDates.map(date => {
                                                        const times = performancesByDate[date].sort();
                                                        const startTime = times[0];
                                                        const lastTime = times[times.length - 1];
                                                        
                                                        // Bereken eindtijd (laatste + 30 min)
                                                        const [h, m] = lastTime.split(':').map(Number);
                                                        const d = new Date();
                                                        d.setHours(h, m + 30);
                                                        const endTime = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

                                                        // Zeker weten dat de datum NL format is
                                                        let displayDateLabel = date;
                                                        const dateObj = parseDateForSorting(date);
                                                        if (!isNaN(dateObj.getTime())) {
                                                            displayDateLabel = dateObj.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                        }

                                                        return (
                                                            <span key={date} className="block">
                                                                {sortedDates.length > 1 && <span className="font-semibold text-xs uppercase mr-1">{displayDateLabel.split(' ')[0]}:</span>}
                                                                {startTime} - {endTime}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-gray-700 line-clamp-3">
                                        {language === 'nl' ? route.text : (route.textEng || route.text)}
                                    </p>
                                </div>
                            </div>
                        );
                    }))}
                </div>
            </div>
         );
      case 'performance':
        return <PerformanceDetailPopup item={popupContent.data} language={language} translations={translations} allPerformances={allPerformances} openContentPopup={openContentPopup} onReservationClick={onReservationClick} />;
      case 'iframe':
        return (<iframe ref={iframeRef} onLoad={() => { try { iframeRef.current?.focus(); } catch (e) { console.warn("Could not focus iframe content:", e); } }} src={popupContent.data} title="Meer info" className="w-full h-full border-0 rounded-lg flex-grow" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>);
      case 'text':
        return (<div className="overflow-y-auto flex-grow p-4"><h2 className="text-2xl font-bold mb-4 text-white">{popupContent.data.title}</h2>{renderGenericPopupText(popupContent.data.text)}</div>);
      case 'customText':
        return (<div className="overflow-y-auto flex-grow p-4 sm:p-6 flex flex-col items-center"><div className="w-full max-w-4xl"><CustomTextRenderer text={popupContent.data.text} imageUrl={popupContent.data.imageUrl} title={popupContent.data.title} layout={popupContent.data.layout || 'default'} /></div></div>);
      case 'calmRouteInfo':
        return (<div className="overflow-y-auto flex-grow p-4"><h2 className="text-2xl font-bold mb-4 text-white">{popupContent.data.title}</h2>{renderGenericPopupText(popupContent.data.text)}{popupContent.data.button && (<button onClick={() => window.open('https://stamgast.cafetheaterfestival.nl/', '_blank')} className="mt-4 px-6 py-3 bg-[#78b5e3] text-white rounded-lg shadow-md hover:bg-[#9f4493] transition-all duration-200 text-base font-semibold">{popupContent.data.button}</button>)}</div>);
      case 'image':
        return (<ZoomableImage src={popupContent.data} alt={translations[language].common.mapTitle.replace('%s', '')} />);
      default:
        return <p className="text-white">{translations[language].common.noContentAvailable}</p>;
    }
  };
  const showReadAloudButton = ['text', 'calmRouteInfo', 'image', 'performance', 'customText'].includes(popupContent.type);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[90]" onClick={closePopup}>
      <div ref={modalRef} onClick={e => e.stopPropagation()} tabIndex="-1" role="dialog" aria-modal="true" className="bg-[#20747f] text-white p-4 rounded-xl shadow-2xl relative w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        {popupContent.type !== 'iframe' && popupContent.type !== 'image' && popupContent.type !== 'routeSelection' && (<><img src={leftFig} className="hidden md:block absolute left-2 top-20 w-24 opacity-40 pointer-events-none drop-shadow-lg z-0" alt="" /><img src={rightFig} className="hidden md:block absolute right-2 bottom-20 w-24 opacity-40 pointer-events-none drop-shadow-lg z-0" alt="" /></>)}
        <button onClick={closePopup} className="absolute top-2 right-2 text-white hover:text-gray-200 text-3xl font-bold z-20" aria-label={translations[language].common.close}>&times;</button>
        <div className="relative z-10 flex-grow flex flex-col overflow-hidden">{renderContent()}</div>
      </div>
    </div>
  );
};

const PrivacyPolicyModal = ({ showPrivacyPolicy, setShowPrivacyPolicy, language, renderPrivacyPolicyContent, translations }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (showPrivacyPolicy) {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements?.[0];
      const lastElement = focusableElements?.[focusableElements.length - 1];
      const previousActiveElement = document.activeElement;

      modalRef.current?.focus();

      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          setShowPrivacyPolicy(false);
          return;
        }

        if (event.key === 'Tab' && firstElement && lastElement) {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              event.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              event.preventDefault();
            }
          }
        }
      };
      
      const currentModal = modalRef.current;
      currentModal?.addEventListener('keydown', handleKeyDown);

      return () => {
        currentModal?.removeEventListener('keydown', handleKeyDown);
        previousActiveElement?.focus();
      };
    }
  }, [showPrivacyPolicy, setShowPrivacyPolicy]);

  if (!showPrivacyPolicy) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[90]">
      <div 
        ref={modalRef}
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="messagebox-title" 
        aria-describedby="messagebox-message"
        className="bg-white text-gray-800 p-8 rounded-xl shadow-2xl relative w-[95vw] h-[90vh] max-w-4xl flex flex-col">
        <button onClick={() => setShowPrivacyPolicy(false)} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-3xl font-bold z-10" aria-label={translations[language].common.close}>&times;</button>
        <div className="overflow-y-auto flex-grow">
            <h2 className="text-2xl font-bold mb-4 text-[#20747f]">{translations[language].common.privacyPolicy}</h2>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" style={{ color: '#333' }}>
              {renderPrivacyPolicyContent(translations[language].privacyPolicyContent)}
            </div>
        </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ showCustomTooltip, customTooltipContent, customTooltipPosition }) => {
  if (!showCustomTooltip) return null;

  return (
    <div className="fixed bg-[#20747f] text-white p-3 rounded-md shadow-lg z-50 text-base pointer-events-none" style={{ left: customTooltipPosition.x, top: customTooltipPosition.y }}>
      {customTooltipContent}
    </div>
  );
};

const MessageBox = ({ show, title, message, buttons }) => {
  const modalRef = useRef(null);
  useEffect(() => {
    if (show) {
      const focusableElements = modalRef.current?.querySelectorAll('button');
      const firstElement = focusableElements?.[0];
      const lastElement = focusableElements?.[focusableElements.length - 1];
      const previousActiveElement = document.activeElement;

      firstElement?.focus();

      const handleKeyDown = (event) => {
        if (event.key === 'Escape' && buttons.some(b => b.text.toLowerCase() === 'ok' || b.text.toLowerCase() === 'later' || b.text.toLowerCase() === 'annuleren' || b.text.toLowerCase() === 'sluit pop-up')) {
            const defaultAction = buttons.find(b => b.text.toLowerCase() === 'ok' || b.text.toLowerCase() === 'later' || b.text.toLowerCase() === 'annuleren' || b.text.toLowerCase() === 'sluit pop-up');
            if (defaultAction) {
                defaultAction.onClick();
            }
            return;
        }

        if (event.key === 'Tab' && firstElement && lastElement) {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              event.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              event.preventDefault();
            }
          }
        }
      };

      const currentModal = modalRef.current;
      currentModal?.addEventListener('keydown', handleKeyDown);

      return () => {
        currentModal?.removeEventListener('keydown', handleKeyDown);
        previousActiveElement?.focus();
      };
    }
  }, [show, buttons]);
  
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div 
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="messagebox-title" 
        aria-describedby="messagebox-message"
        className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
        {title && <h3 id="messagebox-title" className="text-xl font-bold text-gray-800 mb-2">{title}</h3>}
        <div id="messagebox-message" className="text-lg font-medium text-gray-800 mb-6">{message}</div>
        <div className="flex flex-col sm:flex-row-reverse justify-center space-y-2 sm:space-y-0 sm:space-x-reverse sm:space-x-3">
          {buttons.map((button, index) => (
            <button
              key={index}
              onClick={button.onClick}
              className={`font-bold py-2 px-4 rounded-lg transition duration-300 w-full sm:w-auto ${button.className || 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ExportModal = ({ show, onClose, onExport, language, translations, isExporting, showImageExportOption }) => {
    const modalRef = useRef(null);
    useEffect(() => {
        if (show) {
            const focusableElements = modalRef.current?.querySelectorAll('button');
            const firstElement = focusableElements?.[0];
            const lastElement = focusableElements?.[focusableElements.length - 1];
            const previousActiveElement = document.activeElement;

            firstElement?.focus();

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    onClose();
                    return;
                }
                if (event.key === 'Tab' && firstElement && lastElement) {
                    if (event.shiftKey) {
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            event.preventDefault();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            event.preventDefault();
                        }
                    }
                }
            };
            
            const currentModal = modalRef.current;
            currentModal?.addEventListener('keydown', handleKeyDown);

            return () => {
                currentModal?.removeEventListener('keydown', handleKeyDown);
                previousActiveElement?.focus();
            };
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
            <div 
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="export-title"
              className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full text-gray-800">
                <h3 id="export-title" className="text-xl font-bold text-center mb-6">{translations.common.exportFavoritesTitle}</h3>
                
                <div className="space-y-4">
                    {showImageExportOption && (
                        <button
                            onClick={() => onExport('image')}
                            disabled={isExporting}
                            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                             {isExporting ? translations.common.exporting : translations.common.shareAsImage}
                        </button>
                    )}
                    <button
                        onClick={() => onExport('link')}
                        disabled={isExporting}
                        className="w-full bg-[#78b5e3] hover:bg-[#9f4493] text-black font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                        {isExporting ? "Bezig..." : translations.common.shareAsLink}
                    </button>
                </div>

                 <button onClick={onClose} className="w-full mt-6 text-gray-600 hover:text-gray-800 font-semibold py-2">
                    {translations.common.close}
                </button>
            </div>
        </div>
    );
};

const ImportFavoritesModal = ({ show, onClose, onImport, performances, language, translations }) => {
    const modalRef = useRef(null);
    useEffect(() => {
        if (show) {
            const focusableElements = modalRef.current?.querySelectorAll('button');
            const firstElement = focusableElements?.[0];
            const lastElement = focusableElements?.[focusableElements.length - 1];
            const previousActiveElement = document.activeElement;

            firstElement?.focus();

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    onClose();
                    return;
                }
                if (event.key === 'Tab' && firstElement && lastElement) {
                    if (event.shiftKey) {
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            event.preventDefault();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            event.preventDefault();
                        }
                    }
                }
            };
            
            const currentModal = modalRef.current;
            currentModal?.addEventListener('keydown', handleKeyDown);

            return () => {
                currentModal?.removeEventListener('keydown', handleKeyDown);
                previousActiveElement?.focus();
            };
        }
    }, [show, onClose]);

    if (!show || !performances || performances.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
            <div 
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="import-title"
              className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full text-gray-800 flex flex-col max-h-[80vh]">
                <h2 id="import-title" className="text-xl font-bold text-center mb-4">{translations.common.favoritesFromFriend}</h2>
                <div className="overflow-y-auto flex-grow mb-6 border-t border-b py-4">
                    <ul className="space-y-2">
                        {performances.map(item => (
                            <li key={item.id} className="p-2 bg-gray-100 rounded-md">
                                <p className="font-semibold text-[#20747f]">{item.artist ? `${item.artist} - ${item.title}` : item.title}</p>
                                <p className="text-sm text-gray-600">{item.date} - {item.time} @ {item.location}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex justify-around gap-4">
                    <button onClick={onClose} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition duration-300">
                        {translations.common.cancel}
                    </button>
                    <button onClick={onImport} className="w-full bg-[#78b5e3] hover:bg-[#9f4493] text-black font-bold py-3 px-4 rounded-lg transition duration-300">
                        {translations.common.import}
                    </button>
                </div>
            </div>
        </div>
    );
};

const OfflineIndicator = ({ isOffline, language, translations, onRetry }) => {
  if (!isOffline) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black text-center p-4 pb-6 z-50 text-sm font-semibold shadow-lg flex items-center justify-center gap-4">
      <span>{translations[language].common.offlineIndicator}</span>
      <button onClick={onRetry} className="bg-black/20 text-white font-bold py-1 px-3 rounded-md hover:bg-black/40 transition-colors">
        {translations[language].common.tryAgain}
      </button>
    </div>
  );
};

const MoreInfoPage = ({ generalInfoItems, openContentPopup, language, translations }) => {
  const handleItemClick = (item) => {
    const itemText = item.tekst?.[language] || item.tekst?.nl;
    const itemTitle = item.title[language] || item.title.nl;
    if (item.weergave && itemText) {
      openContentPopup('customText', {
        text: itemText,
        imageUrl: item.imageUrl,
        title: itemTitle
      });
    } else {
      const itemUrl = item.url?.[language] || item.url?.nl;
      openContentPopup('iframe', itemUrl);
    }
  };

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick(item);
    }
  };
    
  const renderInfoSection = (title, items, showTitle = true) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-12">
        {showTitle && <h2 className="text-3xl font-bold text-white mb-8 text-center drop_shadow-lg">{title}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
          {items.map((item, index) => {
            const itemTitle = item.title[language] || item.title.nl;
            
            return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full md:w-[384px]"
                  onClick={() => handleItemClick(item)}
                  onKeyDown={(e) => handleKeyDown(e, item)}
                  tabIndex="0"
                  role="button"
                >
                  <img
                    src={item.imageUrl}
                    alt={`Afbeelding van ${itemTitle}`}
                    className="w-full h-48 object-cover"
                    onError={(e) => { e.target.src = 'https://placehold.co/600x400/20747f/FFFFFF?text=Afbeelding+niet+gevonden'; }}
                  />
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-800">{itemTitle}</h2>
                  </div>
                </div>
            )
          })}
        </div>
      </div>
    );
  };

  const hasContent = (generalInfoItems && generalInfoItems.length > 0);

  if (!hasContent) {
    return (
      <div className="text-center text-white p-4 bg-white bg-opacity-20 rounded-xl shadow-lg">
        Geen extra informatie beschikbaar.
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pt-20">
      {renderInfoSection(translations[language].common.general, generalInfoItems, true)}
    </div>
  );
};

const AccessibilityPage = ({ accessibilityInfoItems, openContentPopup, language, translations }) => {
  const handleItemClick = (item) => {
    const itemText = item.tekst?.[language] || item.tekst?.nl;
    const itemTitle = item.title[language] || item.title.nl;
    if (item.weergave && itemText) {
      openContentPopup('customText', {
        text: itemText,
        imageUrl: item.imageUrl,
        title: itemTitle
      });
    } else {
      const itemUrl = item.url?.[language] || item.url?.nl;
      openContentPopup('iframe', itemUrl);
    }
  };

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick(item);
    }
  };

  if (!accessibilityInfoItems || accessibilityInfoItems.length === 0) {
    return (
      <div className="text-center text-white p-4 bg-white bg-opacity-20 rounded-xl shadow-lg">
        Geen toegankelijkheidsinformatie beschikbaar.
      </div>
    );
  }

  return (
      <div className="w-full max-w-6xl mx-auto pt-20">
          <h2 className="text-3xl font-bold text-white mb-8 text-center drop_shadow-lg">{translations[language].common.accessibility}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {accessibilityInfoItems.map((item, index) => {
                  const itemTitle = item.title[language] || item.title.nl;
                  return (
                      <div key={index} className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full md:w-[384px]" onClick={() => handleItemClick(item)} onKeyDown={(e) => handleKeyDown(e, item)} tabIndex="0" role="button">
                          <img src={item.imageUrl} alt={`Afbeelding van ${itemTitle}`} className="w-full h-48 object-cover" onError={(e) => { e.target.src = 'https://placehold.co/600x400/20747f/FFFFFF?text=Afbeelding+niet+gevonden'; }} />
                          <div className="p-4"><h2 className="text-lg font-semibold text-gray-800">{itemTitle}</h2></div>
                      </div>
                  );
              })}
          </div>
      </div>
  );
};


const NewsPage = ({ newsItems, openContentPopup, language, translations }) => {
  if (!newsItems || newsItems.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-full mx-auto py-16">
      <h1 className="text-3xl font-bold text-white mb-8 text-center drop_shadow-lg px-4">{translations[language].common.news}</h1>
      <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide pl-4 pr-4 md:pl-8 lg:pl-16">
        {newsItems.map((item, index) => {
          const itemTitle = item.title[language] || item.title.nl;
          const isAd = item.isAdvertisement;

          const handleClick = () => {
            const itemText = item.tekst?.[language] || item.tekst?.nl;
            if (item.weergave && itemText) {
                openContentPopup('customText', { 
                    text: itemText,
                    imageUrl: item.imageUrl,
                    title: itemTitle,
                    layout: 'side-by-side'
                });
            } else {
                const itemUrl = item.url?.[language] || item.url?.nl;
                openContentPopup('iframe', itemUrl);
            }
          };

          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl flex-shrink-0 w-[340px]"
              onClick={handleClick}
              tabIndex="0"
              role="button"
              onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClick();
                  }
              }}
            >
              {isAd && (
                <div className="bg-[#2e9aaa] text-white text-xs font-bold uppercase tracking-wider text-center py-1 px-2">
                    {translations[language].common.advertisement}
                </div>
              )}
              <img
                src={item.imageUrl}
                alt={`[Afbeelding van ${itemTitle}]`}
                className="w-full h-48 object-cover"
                onError={(e) => { e.target.src = 'https://placehold.co/600x400/20747f/FFFFFF?text=Afbeelding+niet+gevonden'; }}
              />
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-800">{itemTitle}</h2>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

const ScrollDownButton = ({ onClick, translations, language }) => (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
        <button
            onClick={onClick}
            className="animate-bounce bg-black/30 p-2 w-20 h-20 ring-1 ring-white/30 backdrop-blur-md rounded-full text-white flex items-center justify-center shadow-lg"
            aria-label={translations[language].common.news}
        >
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" transform="rotate(180 10 10)" />
            </svg>
        </button>
    </div>
);

// NEW: Component for the App's Privacy Policy page
const AppPrivacyPolicyPage = ({ language, translations }) => {
    const policy = translations[language].appPrivacyPolicy;
    return (
        <div className="w-full max-w-4xl mx-auto pt-28 sm:pt-24 pb-12 px-4 sm:px-6 md:px-8 text-white">
            <div className="bg-black bg-opacity-30 p-8 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-6 text-center">{policy.title}</h1>
                <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                    {renderPrivacyPolicyContent(policy.content, 'text-gray-300')}
                </div>
            </div>
        </div>
    );
};

// NEW: Component for the App Download Popup
const AppDownloadPopup = ({ show, onClose, language, translations }) => {
    const t = translations[language].appDownload;
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100]">
            <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="download-popup-title"
                className="bg-[#20747f] text-white rounded-lg p-6 shadow-xl max-w-md w-full text-center relative animate-fade-in"
            >
                <button onClick={onClose} className="absolute top-2 right-2 text-white hover:text-gray-200 text-3xl font-bold z-10" aria-label={translations[language].common.close}>&times;</button>
                <h1 id="download-popup-title" className="text-2xl font-bold mb-4">{t.popupTitle}</h1>
                <div className="flex justify-center items-center space-x-4 my-6">
                    <a href="https://play.google.com/store/apps/details?id=nl.cafetheaterfestival.ctftimetable&pli=1" target="_blank" rel="noopener noreferrer">
                        <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt={t.playStoreAlt} className="h-16" />
                    </a>
                    <a href="https://apps.apple.com/app/ctf-timetable/id6752912026" target="_blank" rel="noopener noreferrer">
                        <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt={t.appStoreAlt} className="h-16" />
                    </a>
                </div>
            </div>
        </div>
    );
};

// ========= WIJZIGING: AppFooter aangepast om sponsorlogo's klikbaar te maken =========
const AppFooter = ({ logos, language, translations, setShowPrivacyPolicy }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef(null);
    const intervalRef = useRef(null);
    const interactionTimeoutRef = useRef(null);
    
    const [isInteracting, setIsInteracting] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartTranslate, setDragStartTranslate] = useState(0);
    const [currentTranslate, setCurrentTranslate] = useState(0);

    const extendedLogos = useMemo(() => {
        if (!logos || logos.length < 6) return logos || [];
        return [...logos, ...logos, ...logos];
    }, [logos]);

    const getItemWidth = useCallback(() => {
        if (containerRef.current && containerRef.current.children[0]) {
            const logoItem = containerRef.current.children[0];
            const styles = window.getComputedStyle(logoItem);
            return logoItem.offsetWidth + parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
        }
        return 256; // Fallback
    }, []);

    const resetAutoScroll = useCallback(() => {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setCurrentIndex(prev => prev + 1);
        }, 4000);
    }, []);

    useEffect(() => {
        if (isInteracting || !logos || logos.length < 6) return;
        
        const itemWidth = getItemWidth();
        let targetTranslate = -currentIndex * itemWidth;
        
        if (currentIndex >= logos.length * 2) {
            setTimeout(() => {
                const newIndex = currentIndex % logos.length;
                const jumpTranslate = -newIndex * itemWidth;
                if (containerRef.current) containerRef.current.style.transition = 'none';
                setCurrentTranslate(jumpTranslate);
                setCurrentIndex(newIndex);
                
                requestAnimationFrame(() => {
                    if (containerRef.current) containerRef.current.style.transition = 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
                });
            }, 1500);
        }
        
        setCurrentTranslate(targetTranslate);
        resetAutoScroll();

        return () => clearInterval(intervalRef.current);
    }, [currentIndex, isInteracting, logos, getItemWidth, resetAutoScroll]);

    const handleInteractionStart = (clientX) => {
        clearInterval(intervalRef.current);
        clearTimeout(interactionTimeoutRef.current);
        setIsInteracting(true);
        setDragStartX(clientX);
        setDragStartTranslate(currentTranslate);
        if (containerRef.current) containerRef.current.style.transition = 'none';
    };

    const handleInteractionMove = (clientX) => {
        if (!isInteracting) return;
        const dragDelta = clientX - dragStartX;
        setCurrentTranslate(dragStartTranslate + dragDelta);
    };

    const handleInteractionEnd = () => {
        if (!isInteracting) return;
        setIsInteracting(false);

        const itemWidth = getItemWidth();
        const newIndex = Math.round(-currentTranslate / itemWidth);
        const clampedIndex = Math.max(0, Math.min(newIndex, extendedLogos.length - 1));

        if (containerRef.current) {
            containerRef.current.style.transition = 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
        }
        setCurrentIndex(clampedIndex);

        interactionTimeoutRef.current = setTimeout(resetAutoScroll, 5000);
    };

    return (
        <footer className="w-full bg-black bg-opacity-50 text-white text-center pt-12 mt-12 overflow-hidden">
            <div className="max-w-7xl mx-auto mb-12 px-4 grid grid-cols-1 md:grid-cols-3 items-start gap-8">
                {/* Kolom 1: Download Knoppen */}
                <div className="text-left">
                    <h1 className="font-bold text-lg mb-2">{translations[language].appDownload.title}</h1>
                    <div className="flex items-center space-x-2">
                         <a href="https://play.google.com/store/apps/details?id=nl.cafetheaterfestival.ctftimetable&pli=1" target="_blank" rel="noopener noreferrer" className="inline-block">
                            <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt={translations[language].appDownload.playStoreAlt} className="h-12" />
                        </a>
                        <a href="https://apps.apple.com/app/ctf-timetable/id6752912026" target="_blank" rel="noopener noreferrer" className="inline-block">
                            <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt={translations[language].appDownload.appStoreAlt} className="h-12" />
                        </a>
                    </div>
                </div>

                {/* Kolom 2: Nieuwsbrief - Nu overal zichtbaar */}
                <NewsletterForm language={language} />

                {/* Kolom 3: Info Tekst & Privacy Policy */}
                <div className="bg-[#78b5e3] p-6 rounded-lg shadow-lg text-black w-full h-full flex flex-col justify-between">
                    <p className="text-base text-left mb-4">
                        {translations[language].common.footerIntroText}
                    </p>
                    <div className="text-right">
                        <button 
                            onClick={() => setShowPrivacyPolicy(true)}
                            className="px-4 py-2 rounded-lg font-semibold bg-white bg-opacity-50 text-black hover:bg-opacity-70 transition-colors duration-200 text-sm"
                        >
                            {translations[language].common.privacyPolicy}
                        </button>
                    </div>
                </div>
            </div>

            {logos && logos.length > 0 && (
                <>
                    <h1 className="text-lg font-semibold mb-4 px-4">{translations[language].common.footerText}</h1>
                    <div 
                        className="relative h-24 flex items-center cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => { e.preventDefault(); handleInteractionStart(e.pageX); }}
                        onMouseMove={(e) => { e.preventDefault(); handleInteractionMove(e.pageX); }}
                        onMouseUp={handleInteractionEnd}
                        onMouseLeave={handleInteractionEnd}
                        onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX)}
                        onTouchMove={(e) => handleInteractionMove(e.touches[0].clientX)}
                        onTouchEnd={handleInteractionEnd}
                    >
                        <div 
                            className="flex" 
                            ref={containerRef}
                            style={{
                                transform: `translateX(${currentTranslate}px)`,
                                transition: isInteracting ? 'none' : 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            {extendedLogos.map((logo, index) => {
                                const Wrapper = logo.link ? 'a' : 'div';
                                return (
                                    <Wrapper
                                        key={index}
                                        href={logo.link || undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group relative flex-shrink-0 h-20 w-48 flex items-center justify-center mx-8"
                                        tabIndex={-1}
                                    >
                                        <img 
                                            src={logo.url} 
                                            alt={`Afbeelding van Begunstiger logo ${logo.name}`}
                                            className="max-h-16 w-auto object-contain transition-transform duration-300 ease-in-out group-hover:scale-125 group-hover:-translate-y-3" 
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        <div className="absolute bottom-full mb-2 w-max px-3 py-1 bg-gray-800 bg-opacity-80 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out pointer-events-none z-20">
                                            {logo.name}
                                        </div>
                                    </Wrapper>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </footer>
    );
};

const CookieConsentPopup = ({ onAcceptAll, onAcceptFunctional, onDecline, language, translations }) => {
  const t = translations[language].cookiePopup;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 backdrop-blur-sm p-4 z-[100] text-white shadow-lg animate-fade-in">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="font-bold text-lg mb-1">{t.title}</h2>
          <p className="text-sm text-gray-300">{t.text}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <button 
            onClick={onAcceptAll} 
            className="px-5 py-2 rounded-lg font-semibold bg-[#2e9aaa] hover:bg-[#20747f] transition-colors duration-200"
          >
            {t.acceptAll}
          </button>
          <button 
            onClick={onAcceptFunctional}
            className="px-5 py-2 rounded-lg font-semibold bg-white/20 hover:bg-white/30 transition-colors duration-200"
          >
            {t.acceptFunctional}
          </button>
          <button 
            onClick={onDecline}
            className="px-5 py-2 rounded-lg font-semibold bg-transparent hover:bg-white/10 transition-colors duration-200"
          >
            {t.decline}
          </button>
        </div>
      </div>
    </div>
  );
};

// De hoofdcomponent van de app
const AppContent = () => {
  const GA_MEASUREMENT_ID = 'G-FQVC6NGTMP';
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState({ type: null, data: null });
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('timetable'); 
  const [uniqueEvents, setUniqueEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [scheduledCustomNotifications, setScheduledCustomNotifications] = useState(new Set());
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'nl');
  const [showCustomTooltip, setShowCustomTooltip] = useState(false);
  const [customTooltipContent, setCustomTooltipContent] = useState('');
  const [customTooltipPosition, setCustomTooltipPosition] = useState({ x: 0, y: 0 });
  const [messageBoxConfig, setMessageBoxConfig] = useState({ show: false, message: '', buttons: [], title: '' });
  const [permissionRequestDismissed, setPermissionRequestDismissed] = useState(false);
  const [eventInfoMap, setEventInfoMap] = useState({});
  const [currentSponsorInfo, setCurrentSponsorInfo] = useState(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [eventViewMode, setEventViewMode] = useState('card');
  const [favoritesViewMode, setFavoritesViewMode] = useState('card');
  const [friendsFavoritesViewMode, setFriendsFavoritesViewMode] = useState('card');
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [friendsFavorites, setFriendsFavorites] = useState(new Set());
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [sharedFavoritesForImport, setSharedFavoritesForImport] = useState([]);
  const [iconFilters, setIconFilters] = useState(new Set());
  const [filterScope, setFilterScope] = useState('current');
  const [genreFilters, setGenreFilters] = useState(new Set());
  const [generalInfoData, setGeneralInfoData] = useState([]);
  const [accessibilityInfoData, setAccessibilityInfoData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [benefactorLogos, setBenefactorLogos] = useState([]);
  const [cookieConsent, setCookieConsent] = useState(null);
  const [showAppDownloadPopup, setShowAppDownloadPopup] = useState(false);
  
  const [activePerformance, setActivePerformance] = useState(null);
  // NIEUW: State voor actieve info pagina (volledig scherm)
  const [activeInfoPage, setActiveInfoPage] = useState(null);
  // NIEUW: State voor Routes
  const [routesData, setRoutesData] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);

  // NIEUW: State voor reserverings popup
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationPerformance, setReservationPerformance] = useState(null);

  const openReservationModal = useCallback((performance) => {
      setReservationPerformance(performance);
      setShowReservationModal(true);
  }, []);

  const handleReservationSuccess = useCallback((performanceId, amount) => {
      // Automatische lokale capaciteit aanpassing is verwijderd.
      // De app haalt bij de volgende achtergrond-refresh de CurrentReserverenCapacity direct uit Appwrite.
  }, []);

  // NIEUW: Figuren voor landingspagina
  const [landingFigures] = useState(() => getRandomFigures());

  const newsSectionRef = useRef(null);
  const titleRef = useRef(null);
  const sponsorRef = useRef(null);
  const notificationTimeouts = useRef({});
  const prevTimetableDataRef = useRef([]);
  const exportCardViewRef = useRef(null);
  const exportBlockViewRef = useRef(null);

  const trackPageView = useCallback(() => {
    if (localStorage.getItem('cookieConsent') === 'all') {
      const pagePath = window.location.pathname + window.location.hash;
      ReactGA.send({ hitType: "pageview", page: pagePath, title: document.title });
    }
  }, []);

  const trackEvent = useCallback((category, action, label) => {
    if (localStorage.getItem('cookieConsent') === 'all') {
      ReactGA.event({ category, action, label });
    }
  }, []);

  const safetyIcons = useMemo(() => getSafetyIcons(translations, language), [language]);
  
  const allGenres = useMemo(() => {
    const genreKeys = new Set();
    const relevantData = selectedEvent 
      ? timetableData.filter(item => item.event === selectedEvent)
      : timetableData;

    relevantData.forEach(item => {
        if (item.genre && item.genre !== 'N/A') {
            item.genre.split(',').forEach(g => genreKeys.add(g.trim()));
        }
    });

    return [...genreKeys].map(key => ({
        key: key,
        label: translations[language].genres[key] || key
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [timetableData, selectedEvent, language, translations]);

  useEffect(() => {
    setGenreFilters(new Set());
  }, [selectedEvent]);

  const formattedData = useMemo(() => {
    let sourceData;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    if (currentView === 'favorites') {
        sourceData = timetableData.filter(item => favorites.has(item.id));
    } else if (currentView === 'friends-favorites') {
        sourceData = timetableData.filter(item => friendsFavorites.has(item.id));
    } else {
        sourceData = timetableData;
    }
    
    const applyFilters = (data) => data.filter(item => {
        if (iconFilters.size > 0) {
            for (const filterKey of iconFilters) {
                if (!item.safetyInfo[filterKey]) return false;
            }
        }
        
        if (genreFilters.size > 0) {
            if (!item.genre || item.genre === 'N/A') return false;
            const itemGenres = item.genre.split(',').map(g => g.trim());
            if (!itemGenres.some(g => genreFilters.has(g))) return false;
        }

        if (searchTerm) {
            const inArtist = item.artist && item.artist.toLowerCase().includes(lowerCaseSearchTerm);
            const inTitle = item.title.toLowerCase().includes(lowerCaseSearchTerm);
            const inLocation = item.location.toLowerCase().includes(lowerCaseSearchTerm);
            if (!inArtist && !inTitle && !inLocation) return false;
        }
        
        return true;
    });

    if (filterScope === 'all' && (iconFilters.size > 0 || genreFilters.size > 0)) {
        sourceData = applyFilters(sourceData);
    } else if (filterScope === 'current' && selectedEvent) {
        const eventData = sourceData.filter(item => item.event === selectedEvent);
        const otherData = sourceData.filter(item => item.event !== selectedEvent);
        sourceData = [...applyFilters(eventData), ...otherData];
    } else if (searchTerm) {
        sourceData = applyFilters(sourceData);
    }

    if (currentView === 'timetable' && selectedEvent) {
        if (selectedDate === 'calm-route') {
            sourceData = sourceData.filter(item => item.event === selectedEvent && item.isCalmRoute);
        } else if (selectedDate === 'utrecht-centraal') { // NIEUW: Filter voor Utrecht CS
             sourceData = sourceData.filter(item => 
                item.event === selectedEvent && 
                (item.location && item.location.toLowerCase().includes('utrecht centraal'))
            );
        } else if (selectedDate === 'all-performances') {
            const uniqueTitles = new Map();
            sourceData.filter(item => item.event === selectedEvent).forEach(item => {
                const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;
                if (!uniqueTitles.has(fullTitle)) uniqueTitles.set(fullTitle, item);
            });
            sourceData = [...uniqueTitles.values()];
        } else if (selectedDate) {
            sourceData = sourceData.filter(item => 
                item.event === selectedEvent && 
                item.date === selectedDate &&
                !(item.location && item.location.toLowerCase().includes('utrecht centraal'))
            );
        }
    }
    
    if (sourceData.length === 0) return [];

    if (currentView === 'favorites' || currentView === 'friends-favorites' || searchTerm || (filterScope === 'all' && (iconFilters.size > 0 || genreFilters.size > 0)) || selectedDate === 'utrecht-centraal') {
        // Als we Utrecht CS selecteren, willen we ook graag de groepering per datum zien
        const groupedByEvent = sourceData.reduce((acc, item) => {
            (acc[item.event] = acc[item.event] || []).push(item);
            return acc;
        }, {});
        return Object.keys(groupedByEvent).sort((a, b) => {
            const dateA = parseDateForSorting(eventInfoMap[a]?.dateString);
            const dateB = parseDateForSorting(eventInfoMap[b]?.dateString);
            if (!dateA || isNaN(dateA.getTime())) return 1;
            if (!dateB || isNaN(dateB.getTime())) return -1;
            return dateA - dateB;
        }).map(eventName => {
            const itemsForEvent = groupedByEvent[eventName];
            const groupedByDate = itemsForEvent.reduce((acc, item) => {
                (acc[item.date] = acc[item.date] || []).push(item);
                return acc;
            }, {});
            return {
                groupTitle: eventName,
                subGroups: Object.keys(groupedByDate).sort((a,b) => parseDateForSorting(a) - parseDateForSorting(b)).map(date => ({
                    subGroupTitle: date,
                    items: groupedByDate[date].sort((a, b) => a.time.localeCompare(b.time))
                }))
            };
        });
    }

    let groupTitle = null;
    if (selectedDate === 'calm-route') {
        groupTitle = `${translations[language].common.calmRoute} - ${selectedEvent}`;
    }

    const groupedByDate = sourceData.reduce((acc, item) => {
        (acc[item.date] = acc[item.date] || []).push(item);
        return acc;
    }, {});
    
    return [{
      groupTitle,
      subGroups: Object.keys(groupedByDate).sort((a,b) => parseDateForSorting(a) - parseDateForSorting(b)).map(date => ({
        subGroupTitle: selectedDate === 'calm-route' ? date : null,
        items: groupedByDate[date].sort((a, b) => selectedDate === 'all-performances' ? a.title.localeCompare(b.title) : a.time.localeCompare(b.time))
      }))
    }];
  }, [searchTerm, currentView, selectedEvent, selectedDate, timetableData, favorites, friendsFavorites, language, translations, eventInfoMap, iconFilters, genreFilters, filterScope]);

  const favoritesDataForExport = useMemo(() => {
    const favoriteItems = timetableData.filter(item => favorites.has(item.id));
    if (favoriteItems.length === 0) return [];

    const groupedByEvent = favoriteItems.reduce((acc, item) => {
        (acc[item.event] = acc[item.event] || []).push(item);
        return acc;
    }, {});

    return Object.keys(groupedByEvent).sort((a, b) => {
        const dateA = parseDateForSorting(eventInfoMap[a]?.dateString);
        const dateB = parseDateForSorting(eventInfoMap[b]?.dateString);
        if (!dateA || isNaN(dateA.getTime())) return 1;
        if (!dateB || isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
    }).map(eventName => {
        const itemsForEvent = groupedByEvent[eventName];
        const groupedByDate = itemsForEvent.reduce((acc, item) => {
            (acc[item.date] = acc[item.date] || []).push(item);
            return acc;
        }, {});
        return {
            groupTitle: eventName,
            subGroups: Object.keys(groupedByDate).sort((a,b) => parseDateForSorting(a) - parseDateForSorting(b)).map(date => ({
                subGroupTitle: date,
                items: groupedByDate[date].sort((a, b) => a.time.localeCompare(b.time))
            }))
        };
    });
  }, [timetableData, favorites, eventInfoMap]);


  const handleAnimatedUpdate = useCallback((updateFunction) => {
    setIsContentVisible(false);
    setTimeout(() => {
      updateFunction();
      setIsContentVisible(true);
    }, 300);
  }, []);

  const closeMessageBox = useCallback(() => setMessageBoxConfig(prev => ({ ...prev, show: false })), []);

  const showMessageBox = useCallback((message, buttons = [], title = '') => {
    const finalButtons = buttons.length > 0 ? buttons : [{ text: 'OK', onClick: closeMessageBox, className: 'bg-gray-200 hover:bg-gray-300 text-gray-800' }];
    setMessageBoxConfig({ show: true, message, buttons: finalButtons, title });
  }, [closeMessageBox]);

  useEffect(() => {
    const scriptId = 'html-to-image-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const generateAndShareImage = useCallback(async (element) => {
      if (!element) {
          showMessageBox(translations[language].common.exportError);
          return;
      }
      
      const originalBodyColor = document.body.style.backgroundColor;
      try {
          document.body.style.backgroundColor = '#20747f';
          const options = { 
              quality: 0.95, 
              backgroundColor: '#20747f', 
              cacheBust: true,
              imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
              pixelRatio: 2 
          };
          const dataUrl = await window.htmlToImage.toPng(element, options);

          if (window.AndroidBridge && window.AndroidBridge.shareImage) {
              const base64Data = dataUrl.split(',')[1];
              const title = translations[language].common.shareFavorites;
              const text = translations[language].common.shareFavorites;
              const filename = 'ctf-favorieten.png';
              window.AndroidBridge.shareImage(base64Data, filename, title, text);
          } else {
              const blob = await (await fetch(dataUrl)).blob();
              const file = new File([blob], 'ctf-favorieten.png', { type: 'image/png' });
              if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({ files: [file], title: translations[language].common.shareFavorites, text: translations[language].common.shareFavorites });
              } else {
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = 'ctf-favorieten.png';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
              }
          }
      } catch (error) {
          console.error('Fout tijdens het genereren of delen van de afbeelding:', error);
          showMessageBox(translations[language].common.exportError);
      } finally {
          document.body.style.backgroundColor = originalBodyColor;
      }
  }, [language, showMessageBox, translations]);

  const handleExport = useCallback(async (type) => {
    if (type === 'link') {
        const idToIndexMap = new Map(timetableData.map((item, index) => [item.id, index]));
        const favoriteIndices = Array.from(favorites)
            .map(id => idToIndexMap.get(id))
            .filter(index => index !== undefined);

        const encodedIndices = btoa(favoriteIndices.join(',')); 

        const publicBaseUrl = 'https://ldegroen.github.io/ctftimetable/';
        const url = `${publicBaseUrl}?fav_indices=${encodedIndices}`;
        
        const shareData = {
            title: translations[language].common.shareLinkTitle,
            text: translations[language].common.shareLinkBody,
            url: url,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(url);
                showMessageBox(translations[language].common.shareSuccess);
            }
        } catch (err) {
            console.error('Error sharing link:', err);
            showMessageBox(translations[language].common.shareError);
        }
        setShowExportModal(false);
    } else if (type === 'image') {
        setExportConfig({ type: favoritesViewMode });
    }
  }, [favorites, language, showMessageBox, favoritesViewMode, timetableData, translations]);

  useEffect(() => {
    if (!exportConfig) return;

    const doExport = async () => {
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const elementRef = exportConfig.type === 'card' 
            ? exportCardViewRef.current 
            : exportBlockViewRef.current;
            
        if (elementRef && typeof window.htmlToImage !== 'undefined') {
            await generateAndShareImage(elementRef);
        } else {
            console.error("Export prerequisites not met. Element or htmlToImage missing.");
            showMessageBox(translations[language].common.exportError);
        }
        
        setIsExporting(false);
        setExportConfig(null);
        setShowExportModal(false);
    };

    doExport();
  }, [exportConfig, generateAndShareImage, language, showMessageBox, translations]);


  useEffect(() => {
    const handleScroll = () => {
        if (isInitialLoad && !activePerformance && !activeInfoPage && !activeRoute) {
            setShowStickyHeader(window.scrollY > 50);
        } else {
            setShowStickyHeader(true);
        }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isInitialLoad, activePerformance, activeInfoPage, activeRoute]);

  const returnToInitialView = useCallback(() => {
      handleAnimatedUpdate(() => {
        setActivePerformance(null);
        setActiveInfoPage(null); // Reset info page
        setActiveRoute(null); // Reset route
        setCurrentView('timetable');
        setIsInitialLoad(true);
        setSelectedEvent(null);
        setSelectedDate(null);
        setSearchTerm('');
        setShowStickyHeader(false);
        try {
          const base = window.location.pathname.split('/').slice(0, -1).join('/') || '/';
          window.history.pushState({ view: 'initial' }, '', base + '#');
        } catch (e) {
          console.warn("Could not update history state:", e);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }, [handleAnimatedUpdate]);
  
  const handleViewChange = useCallback((view, event = null) => {
    handleAnimatedUpdate(() => {
        setActivePerformance(null);
        setActiveInfoPage(null); // Reset info page
        setActiveRoute(null); // Reset route

        let hash = '#';
        if (view === 'timetable' && event) hash = `#${encodeURIComponent(event)}`;
        else if (view === 'favorites') hash = '#favorites';
        else if (view === 'friends-favorites') hash = '#friends-favorites';
        else if (view === 'more-info') hash = '#more-info';
        else if (view === 'accessibility') hash = '#accessibility';

        const newUrl = window.location.pathname.split('/').slice(0, -1).join('/') + hash;
        const state = { view: 'detail', event, viewMode: 'card', currentView: view };

        try {
            window.history.pushState(state, '', newUrl);
        } catch (e) {
            console.warn("Could not update history state:", e);
        }

        setCurrentView(view);
        setSelectedEvent(event);
        if (view === 'timetable') setEventViewMode('card');
        setIsInitialLoad(false);
        setShowStickyHeader(true);

        if (view === 'timetable' && event) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Filter voorstellingen voor bepaling startdatum
            const validItemsForDefaultDate = timetableData.filter(item => {
                if (item.event !== event || !item.date || item.date === 'N/A') return false;
                
                // Datum moet in de toekomst liggen (of vandaag)
                const performanceDate = parseDateForSorting(item.date);
                if (!performanceDate || performanceDate < today) return false;
                
                // Filter Utrecht Centraal eruit voor default selectie (want die heeft een eigen knop)
                if (item.location && item.location.toLowerCase().includes('utrecht centraal')) return false;
                
                return true;
            });

            // Groepeer per datum om try-outs te checken
            const itemsByDate = {};
            validItemsForDefaultDate.forEach(item => {
                if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
                itemsByDate[item.date].push(item);
            });

            const sortedDates = Object.keys(itemsByDate).sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));

            // Zoek eerste dag die NIET volledig uit try-outs bestaat
            let defaultDate = sortedDates.find(date => {
                const items = itemsByDate[date];
                // Check of alle items op deze dag try-outs zijn. Zo ja, sla deze dag over als default.
                return !items.every(item => item.isTryOut);
            });
            
            // Fallback: als er geen 'normale' dag is gevonden (bijv. alles is try-out), pak de eerste beschikbare dag
            if (!defaultDate && sortedDates.length > 0) {
                defaultDate = sortedDates[0];
            }

            setSelectedDate(defaultDate || 'all-performances');
        } else if (view === 'favorites') {
            setSelectedDate('favorites-view');
        } else if (view === 'friends-favorites') {
            setSelectedDate('friends-favorites-view');
        } else if (view === 'more-info' || view === 'accessibility') {
            setSelectedDate(null);
        }
        
        window.scrollTo({ top: 0, behavior: 'auto'});
    });
  }, [timetableData, handleAnimatedUpdate]);

  const openContentPopup = useCallback((type, data) => {
    let finalData = data;
    if (type === 'iframe' && typeof data === 'string' && data.startsWith('http')) {
        try {
            const url = new URL(data);
            url.searchParams.set('ctf_app', '1');

            // WIJZIGING: 'stamgast.cafetheaterfestival.nl' verwijderd uit deze check
            // Hierdoor wordt er niet meer automatisch '/en' aan de URL toegevoegd voor de stamgast pagina
            if (url.hostname === 'vrijwilliger.cafetheaterfestival.nl') {
                if (language === 'en') {
                    if (!url.pathname.startsWith('/en')) {
                        url.pathname = '/en' + url.pathname;
                    }
                } else {
                    if (url.pathname.startsWith('/en/')) {
                        url.pathname = url.pathname.substring(3);
                    } else if (url.pathname === '/en') {
                        url.pathname = '/';
                    }
                }
            }

            finalData = url.href;
        } catch (e) { console.error("Invalid URL for iframe:", data, e); }
    }

    // NIEUW: Hybride navigatie logica
    let matchedItem = null;
    if (type === 'customText' && data?.title) {
        matchedItem = generalInfoData.find(i => (i.title[language] || i.title.nl) === data.title) ||
                      accessibilityInfoData.find(i => (i.title[language] || i.title.nl) === data.title) ||
                      newsData.find(i => (i.title[language] || i.title.nl) === data.title);
    } else if (type === 'iframe' && typeof data === 'string') {
         matchedItem = generalInfoData.find(i => (i.url[language] || i.url.nl) === data) ||
                       accessibilityInfoData.find(i => (i.url[language] || i.url.nl) === data) ||
                       newsData.find(i => (i.url[language] || i.url.nl) === data);
    }

    if (matchedItem) {
        const title = matchedItem.title[language] || matchedItem.title.nl;
        const slug = slugify(title);
        try {
            window.history.pushState({ infoSlug: slug, view: 'popup' }, '', '/' + slug);
        } catch(e) {
             console.warn("Could not push state for info popup", e);
        }
    }

    setPopupContent({ type, data: finalData });
    setShowPopup(true);
  }, [language, generalInfoData, accessibilityInfoData, newsData]);

  const closePopup = useCallback(() => {
      setShowPopup(false);
  }, []); 

  const handleNavigateToPerformance = useCallback((performance) => {
      const slug = slugify(performance.artist || performance.title);
      const url = `/${slug}`;
      try {
          window.history.pushState({ performanceId: performance.id }, '', url);
      } catch (e) {
          console.warn("Could not update history state for performance:", e);
      }
      setActivePerformance(performance);
      setActiveInfoPage(null); 
      setActiveRoute(null); // Reset route
      setIsInitialLoad(false);
      setShowStickyHeader(true);
      window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const checkForInitialNotification = () => {
      if (window.AndroidBridge && typeof window.AndroidBridge.getInitialNotificationData === 'function') {
        try {
          const jsonData = window.AndroidBridge.getInitialNotificationData();
          if (jsonData) {
            const data = JSON.parse(jsonData);
            if (data && data.url) {
              console.log("Notificatie data ontvangen van native:", data);
              openContentPopup('iframe', data.url);
            }
          }
        } catch (e) {
          console.error("Fout bij het ophalen/parsen van initiële notificatie data:", e);
        }
      }
    };
    
    const timer = setTimeout(checkForInitialNotification, 100);
    return () => clearTimeout(timer);
  }, [openContentPopup]);

  useEffect(() => {
    const isModalOpen = showPopup || showPrivacyPolicy || messageBoxConfig.show || showExportModal || showImportPopup || cookieConsent === null;
    const mainContentEl = document.getElementById('main-content-area');

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      if (mainContentEl) mainContentEl.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (mainContentEl) mainContentEl.style.overflow = 'auto';
    }
  }, [showPopup, showPrivacyPolicy, messageBoxConfig.show, showExportModal, showImportPopup, cookieConsent]);

  const handleCloseAppDownloadPopup = () => {
    try {
        localStorage.setItem('ctfAppDownloadPopupDismissed', 'true');
    } catch (e) {
        console.error("Error saving popup dismissal state:", e);
    }
    setShowAppDownloadPopup(false);
  };

  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem('cookieConsent');
      if (storedConsent) {
        setCookieConsent(storedConsent);
        if (storedConsent === 'all' && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
          ReactGA.initialize(GA_MEASUREMENT_ID);
          console.log("Google Analytics geïnitialiseerd op basis van bestaande toestemming.");
        }
      }
      
      const storedFavorites = localStorage.getItem('ctfTimetableFavorites');
      if (storedFavorites) setFavorites(new Set(JSON.parse(storedFavorites)));

      const storedFriendsFavorites = localStorage.getItem('ctfFriendsFavorites');
      if (storedFriendsFavorites) setFriendsFavorites(new Set(JSON.parse(storedFriendsFavorites)));
      
      const storedGeneralInfo = localStorage.getItem('ctfGeneralInfoCache');
      if (storedGeneralInfo) setGeneralInfoData(JSON.parse(storedGeneralInfo));

      const storedAccessibilityInfo = localStorage.getItem('ctfAccessibilityInfoCache');
      if (storedAccessibilityInfo) setAccessibilityInfoData(JSON.parse(storedAccessibilityInfo));
      
      const storedNews = localStorage.getItem('ctfNewsCache');
      if (storedNews) setNewsData(JSON.parse(storedNews));

      const storedBenefactorLogos = localStorage.getItem('ctfBenefactorLogosCache');
      if (storedBenefactorLogos) setBenefactorLogos(JSON.parse(storedBenefactorLogos));

      const storedCustomNotifs = localStorage.getItem('ctfScheduledCustomNotifications');
      if (storedCustomNotifs) setScheduledCustomNotifications(new Set(JSON.parse(storedCustomNotifs)));
       
      const dismissed = localStorage.getItem('ctfNotificationPermissionDismissed');
      if (dismissed === 'true') setPermissionRequestDismissed(true);
      
    } catch (e) { 
        console.error("Fout bij laden uit localStorage, cache wordt gewist:", e); 
        localStorage.clear();
    }
  }, [GA_MEASUREMENT_ID]); 

  useEffect(() => { localStorage.setItem('appLanguage', language); }, [language]);

  useEffect(() => {
    return () => {
      const timeouts = notificationTimeouts.current;
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    try {
        if (window.AndroidBridge === undefined && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    } catch (e) {
        console.error("Error requesting notification permission:", e);
    }
  }, []); 

  const handleLanguageChange = () => setLanguage(prev => prev === 'nl' ? 'en' : 'nl');

  const fetchDataFromAppwrite = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const client = new Client().setEndpoint(APPWRITE_CONFIG.endpoint).setProject(APPWRITE_CONFIG.projectId);
        const databases = new Databases(client);

        const fetchAllDocuments = async (collectionId) => {
            try {
                let documents = [];
                let response;
                let offset = 0;
                const limit = 100;
                do {
                    response = await databases.listDocuments(APPWRITE_CONFIG.databaseId, collectionId, [Query.limit(limit), Query.offset(offset)]);
                    documents.push(...response.documents);
                    offset += limit;
                } while (documents.length < response.total);
                return documents;
            } catch (e) {
                console.error(`Fout bij ophalen collectie ${collectionId}:`, e);
                return []; // Retourneer leeg zodat de rest van de app gewoon doorlaadt
            }
        };

        const [
            companies, performances, locations, executions,
            eventsData, sponsors, news, info, accessibility, marketing,
            routesRaw
        ] = await Promise.all([
            fetchAllDocuments(APPWRITE_CONFIG.collections.companies),
            fetchAllDocuments(APPWRITE_CONFIG.collections.performances),
            fetchAllDocuments(APPWRITE_CONFIG.collections.locations),
            fetchAllDocuments(APPWRITE_CONFIG.collections.executions),
            fetchAllDocuments(APPWRITE_CONFIG.collections.events),
            fetchAllDocuments(APPWRITE_CONFIG.collections.sponsors),
            fetchAllDocuments(APPWRITE_CONFIG.collections.news),
            fetchAllDocuments(APPWRITE_CONFIG.collections.info),
            fetchAllDocuments(APPWRITE_CONFIG.collections.toegankelijkheid),
            fetchAllDocuments(APPWRITE_CONFIG.collections.marketing),
            fetchAllDocuments(APPWRITE_CONFIG.collections.routes)
        ]);
        clearTimeout(timeoutId);

        const companiesMap = new Map(companies.map(c => [c.$id, c]));
        const performancesMap = new Map(performances.map(p => [p.$id, p]));
        const locationsMap = new Map(locations.map(l => [l.$id, l]));
        const executionsMap = new Map(executions.map(e => [e.$id, e]));
        const marketingMap = new Map(marketing.map(m => [m.PerformanceId, m]));

        // Vertaal ID naar Naam
        const eventIdToNameMap = new Map(eventsData.map(e => [e.$id, e.Name]));

        const parsedRoutes = routesRaw.map(r => ({
            id: r.$id,
            event: eventIdToNameMap.get(r.Event) || r.Event, 
            title: r.Titel,
            titleEng: r.TitelENG,
            text: r.Tekst,
            textEng: r.TekstENG,
            image: r.Afbeelding,
            executionIds: r.Uitvoeringen || [],
            dates: r.Datum || [],
            code: r.Code // NIEUW: Code attribuut toegevoegd
        }));
        setRoutesData(parsedRoutes);

        const sortFunc = (a, b) => {
            const numA = a.Nummer || 999;
            const numB = b.Nummer || 999;
            return numA - numB;
        };
        const sortedInfo = info.sort(sortFunc);
        const sortedAccessibility = accessibility.sort(sortFunc);
        const sortedNews = news.sort(sortFunc);

        const localEventInfoMap = {};
        let allParsedData = [];

        const eventsInApp = eventsData.filter(event => event.InApp === true);

        for (const eventDoc of eventsInApp) {
            localEventInfoMap[eventDoc.Name] = { 
                mapUrl: eventDoc.mapUrl,
                sponsorLogo: eventDoc.sponsorLogoUrl,
                dateString: null, 
                displayDates: eventDoc.Dates 
            };
            
            // --- HIER START WIJZIGING ---
            // We houden bij welke performances al via een execution zijn toegevoegd
            const processedPerformanceIdsForEvent = new Set(); 

            // Verwerk uitvoeringen (zoals bestaande code)
            if (eventDoc.executionIds && eventDoc.executionIds.length > 0) {
                for (const execId of eventDoc.executionIds) {
                    const execution = executionsMap.get(execId);
                    if (!execution) continue;

                    const performance = performancesMap.get(execution.performanceId);
                    if (!performance) continue;

                    if (performance.InApp !== true) continue;
                    
                    const company = companiesMap.get(performance.companyId);
                    const locationData = locationsMap.get(execution.locationId);
                    if (!locationData) continue;

                    const marketingInfo = marketingMap.get(performance.$id);

                    const dateTime = new Date(execution.DateTime);
                    if (isNaN(dateTime.getTime())) continue;
                    
                    const eventDate = dateTime.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const eventTime = dateTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

                    const eventStartDate = parseDateForSorting(localEventInfoMap[eventDoc.Name].dateString);
                    if (eventStartDate || dateTime < eventStartDate) {
                        localEventInfoMap[eventDoc.Name].dateString = eventDate;
                    }

                    allParsedData.push({
                        id: execution.$id,
                        eventId: eventDoc.$id,
                        originalPerformanceId: performance.$id,
                        locationId: locationData.$id,
                        date: eventDate,
                        time: eventTime,
                        artist: company?.Name || 'Onbekend',
                        title: performance.Title || 'Onbekend',
                        location: locationData.Name || 'Onbekende Locatie',
                        url: performance.meerInfoUrl || '',
                        event: eventDoc.Name,
                        googleMapsUrl: locationData.googleMapsUrl || '',
                        pwycLink: performance.pwycLink || '',
                        mapNumber: locationData.locationNumber || 'N/A',
                        mapImageUrl: eventDoc.mapUrl || '',
                        genre: performance.genre || 'N/A',
                        subgenre: performance.Subgenre || [], 
                        isCalmRoute: execution.quietRoute || false,
                        crowdLevel: execution.expectedCrowd || '',
                        isTryOut: execution.TryOut || false, // NIEUW
                        isReservable: execution.reserveerbaar || false, // NIEUW
                        resTextNL: execution.ReserveringTekst || '', // NIEUW
                        resTextENG: execution.ReserveringTekstENG || '', // NIEUW
                        resCapacity: parseInt(execution.ReserveringCapaciteit, 10) || 0, // NIEUW
                        resAvailableCapacity: execution.CurrentReserverenCapacity !== null && execution.CurrentReserverenCapacity !== undefined 
                            ? parseInt(execution.CurrentReserverenCapacity, 10) 
                            : null,
                        artistImageUrl: marketingInfo?.Afbeelding2 || performance.imageUrl || '',
                        safetyInfo: {
                            wheelchairAccessible: locationData.isWheelchairAccessible || false,
                            suitableForChildren: performance.isChildFriendly || false,
                            dutchLanguage: performance.isDutchLanguage || false,
                            englishLanguage: performance.isEnglishLanguage || false,
                            dialogueFree: performance.isDialogueFree || false,
                            diningFacility: locationData.hasDining || false,
                            hasNGT: execution.hasNgt || false,
                        },
                        marketingCredits: marketingInfo?.Credits || null,
                        marketingCreditsENG: marketingInfo?.CreditsENG || null,
                        marketingVoorstellingNL: marketingInfo?.VoorstellingstekstNL || null,
                        marketingVoorstellingENG: marketingInfo?.VoorstellingstekstENG || null,
                        marketingBioNL: marketingInfo?.BioNL || null,
                        marketingBioENG: marketingInfo?.BioENG || null,
                        marketingAfbeelding1: marketingInfo?.Afbeelding1 || null,
                        marketingAfbeelding2: marketingInfo?.Afbeelding2 || null,
                        marketingKeywords: marketingInfo?.Keywords || null,
                        similarRaw: performance.LijktOp || [],
                        differentRaw: performance.LijktNietOp || [],
                        nearbyLocationId: locationData.InDeBuurt || null
                    });
                    
                    // Markeer als verwerkt
                    processedPerformanceIdsForEvent.add(performance.$id);
                }
            }
            
            // --- NIEUWE LOGICA: Voeg performances toe die gekoppeld zijn via eventIds maar geen executions hebben ---
            const linkedPerformances = performances.filter(p => 
                p.InApp === true && 
                p.eventIds && 
                Array.isArray(p.eventIds) && 
                p.eventIds.includes(eventDoc.$id) &&
                !processedPerformanceIdsForEvent.has(p.$id) // Voorkom dubbelen
            );

            for (const p of linkedPerformances) {
                 const company = companiesMap.get(p.companyId);
                 const marketingInfo = marketingMap.get(p.$id);
                 
                 // Probeer een zinnige datum te pakken (de 'startdatum' van het event), of fallback
                 let displayDate = localEventInfoMap[eventDoc.Name].dateString || 'Onbekend';
                 
                 allParsedData.push({
                    id: `linked-${p.$id}-${eventDoc.$id}`, // Uniek ID genereren
                    eventId: eventDoc.$id,
                    originalPerformanceId: p.$id,
                    locationId: 'generic', // Geen specifieke locatie
                    date: displayDate,
                    time: 'Ntb', // Algemene tijdsaanduiding
                    artist: company?.Name || 'Onbekend',
                    title: p.Title || 'Onbekend',
                    location: 'Ntb',
                    url: p.meerInfoUrl || '',
                    event: eventDoc.Name,
                    googleMapsUrl: '',
                    pwycLink: p.pwycLink || '',
                    mapNumber: '',
                    mapImageUrl: eventDoc.mapUrl || '',
                    genre: p.genre || 'N/A',
                    subgenre: p.Subgenre || [], 
                    isCalmRoute: false,
                    crowdLevel: '',
                    isTryOut: false, // NIEUW
                    isReservable: false, // NIEUW
                    resTextNL: '', // NIEUW
                    resTextENG: '', // NIEUW
                    resCapacity: 0, // NIEUW
                    resAvailableCapacity: null,
                    artistImageUrl: marketingInfo?.Afbeelding2 || p.imageUrl || '',
                    safetyInfo: {
                        wheelchairAccessible: false, // Onbekend
                        suitableForChildren: p.isChildFriendly || false,
                        dutchLanguage: p.isDutchLanguage || false,
                        englishLanguage: p.isEnglishLanguage || false,
                        dialogueFree: p.isDialogueFree || false,
                        diningFacility: false, 
                        hasNGT: false,
                    },
                    marketingCredits: marketingInfo?.Credits || null,
                    marketingCreditsENG: marketingInfo?.CreditsENG || null,
                    marketingVoorstellingNL: marketingInfo?.VoorstellingstekstNL || null,
                    marketingVoorstellingENG: marketingInfo?.VoorstellingstekstENG || null,
                    marketingBioNL: marketingInfo?.BioNL || null,
                    marketingBioENG: marketingInfo?.BioENG || null,
                    marketingAfbeelding1: marketingInfo?.Afbeelding1 || null,
                    marketingAfbeelding2: marketingInfo?.Afbeelding2 || null,
                    marketingKeywords: marketingInfo?.Keywords || null,
                    similarRaw: p.LijktOp || [],
                    differentRaw: p.LijktNietOp || [],
                    nearbyLocationId: null
                 });
            }
            // --- EINDE WIJZIGING ---
        }

        const filteredDataForDisplay = allParsedData;
        
        const uniqueEventsForDisplay = Object.keys(localEventInfoMap)
            .filter(eventName => eventsInApp.some(e => e.Name === eventName))
            .sort((a,b) => (parseDateForSorting(localEventInfoMap[a]?.dateString) || 0) - (parseDateForSorting(localEventInfoMap[b]?.dateString) || 0));

        const tempGeneralInfoItems = sortedInfo.map(item => ({
            title: { nl: item.NameNl, en: item.NameEng },
            url: { nl: item.MeerInfoNl, en: item.MeerInfoEng },
            imageUrl: item.MeerInfoAfbeelding,
            weergave: item.Weergave || false,
            tekst: { nl: item.TekstNL, en: item.TekstENG }
        }));
        
        const tempAccessibilityInfoItems = sortedAccessibility.map(item => ({
            title: { nl: item.ToegankelijkheidTitleNl, en: item.ToegankelijkheidTitleEng },
            url: { nl: item.ToegankelijkheidUrlNl, en: item.ToegankelijkheidUrlEng },
            imageUrl: item.ToegankelijkheidAfbeelding,
            weergave: item.Weergave || false,
            tekst: { nl: item.TekstNL, en: item.TekstENG }
        }));

        const tempNewsItems = sortedNews.map(item => ({
            title: { nl: item.NieuwsTitelNl, en: item.NieuwsTitelEng },
            url: { nl: item.NieuwsUrlNl, en: item.NieuwsUrlEng },
            imageUrl: item.NieuwsAfbeelding,
            weergave: item.Weergave || false,
            tekst: { nl: item.TekstNL, en: item.TekstENG },
            createdAt: item.createdAt || item.$createdAt,
            isAdvertisement: item.Advertentie || false
        }))
        .slice(0, 10);
        
        const tempBenefactorLogos = sponsors.map(item => ({ 
            url: item.LogoSponsor, 
            name: item.Name, 
            link: item.Link 
        }));
        
        setError(null);
        setIsOffline(false);
        setTimetableData(filteredDataForDisplay);
        setEventInfoMap(localEventInfoMap);
        setUniqueEvents(uniqueEventsForDisplay);
        setGeneralInfoData(tempGeneralInfoItems);
        setAccessibilityInfoData(tempAccessibilityInfoItems);
        setNewsData(tempNewsItems);
        setBenefactorLogos(tempBenefactorLogos);
        
        localStorage.setItem('ctfAppwriteCache', JSON.stringify({
            data: filteredDataForDisplay, eventInfoMap: localEventInfoMap, uniqueEvents: uniqueEventsForDisplay,
            generalInfo: tempGeneralInfoItems, accessibilityInfo: tempAccessibilityInfoItems,
            news: tempNewsItems, benefactors: tempBenefactorLogos, 
            routes: parsedRoutes,
            timestamp: new Date().getTime()
        }));
        
        return { generalInfo: tempGeneralInfoItems, accessibilityInfo: tempAccessibilityInfoItems, news: tempNewsItems, timetable: filteredDataForDisplay, routes: parsedRoutes };

    } catch (err) {
        console.error("Fout bij het ophalen van Appwrite gegevens:", err);
        const cached = localStorage.getItem('ctfAppwriteCache');

        if (cached) {
            setIsOffline(true);
            const { generalInfo, accessibilityInfo, news, routes } = JSON.parse(cached);
            return { generalInfo: generalInfo || [], accessibilityInfo: accessibilityInfo || [], news: news || [], timetable: timetableData, routes: routes || [] };
        } else {
            if (err.name === 'AbortError') {
                 setError(translations[language].common.errorTimeout);
            } else {
                 setError(translations[language].common.errorLoading);
            }
        }
        return { generalInfo: [], accessibilityInfo: [], news: [], timetable: timetableData, routes: [] };
    }
  }, [language, timetableData, translations]);

  useEffect(() => {
    const init = async () => {
        let activeData = [];
        let activeRoutes = [];
        let activeGeneralInfo = [];
        let activeAccessibilityInfo = [];
        let activeNews = [];
        let hasCache = false;

        // 1. STALE-WHILE-REVALIDATE LOGICA
        try {
            const cached = localStorage.getItem('ctfAppwriteCache');
            if (cached) {
                const { data, eventInfoMap, uniqueEvents, generalInfo, accessibilityInfo, news, benefactors, routes } = JSON.parse(cached);
                activeData = data || [];
                activeGeneralInfo = generalInfo || [];
                activeAccessibilityInfo = accessibilityInfo || [];
                activeNews = news || [];
                activeRoutes = routes || [];
                
                setTimetableData(activeData);
                setEventInfoMap(eventInfoMap || {});
                setUniqueEvents(uniqueEvents || []);
                setGeneralInfoData(activeGeneralInfo);
                setAccessibilityInfoData(activeAccessibilityInfo);
                setNewsData(activeNews);
                setBenefactorLogos(benefactors || []);
                setRoutesData(activeRoutes);
                
                hasCache = true;
                // BELANGRIJK: We stoppen met laden zodra we cache hebben! De UI wordt direct bruikbaar.
                setLoading(false); 
            } else {
                // Geen cache, we moeten wachten
                setLoading(true); 
            }
        } catch (e) {
            console.error("Kon cache niet laden, cache wordt gewist", e);
            localStorage.clear();
            setLoading(true);
        }
        
        // 2. ROUTING LOGICA DIRECT UITVOEREN (met gecachete of lege data)
        const urlParams = new URLSearchParams(window.location.search);
        const favoriteIndicesParam = urlParams.get('fav_indices');
        const favoriteIdsParam = urlParams.get('favorites');
        const path = window.location.pathname;
        const pathSegments = path.split('/').filter(Boolean);

        let performancesToImport = [];

        if (favoriteIndicesParam) {
            try {
                const decodedIndices = atob(favoriteIndicesParam).split(',').map(Number);
                performancesToImport = decodedIndices.map(index => activeData[index]).filter(Boolean);
            } catch (e) { console.error("Error decoding favorite indices", e); }
        } else if (favoriteIdsParam) {
            try {
                const decodedIds = atob(favoriteIdsParam).split(',');
                performancesToImport = activeData.filter(p => decodedIds.includes(p.id));
            } catch (e) { console.error("Error decoding favorite IDs", e); }
        }

        if (performancesToImport.length > 0) {
            setSharedFavoritesForImport(performancesToImport);
            setShowImportPopup(true);
        } else if (pathSegments.length > 0) {
            const slug = pathSegments[0];
            const performance = activeData.find(p => slugify(p.artist || p.title) === slug);
            
            if (performance) {
                setActivePerformance(performance);
                setActiveInfoPage(null);
                setActiveRoute(null);
                setIsInitialLoad(false);
                setShowStickyHeader(true);
            } else {
                const routeItem = activeRoutes.find(r => slugify(r.title) === slug || slugify(r.titleEng) === slug);
                if (routeItem) {
                    setActiveRoute(routeItem);
                    setActivePerformance(null);
                    setActiveInfoPage(null);
                    setIsInitialLoad(false);
                    setShowStickyHeader(true);
                    if (routeItem.event) setSelectedEvent(routeItem.event);
                } else {
                    const allInfo = [...activeGeneralInfo, ...activeAccessibilityInfo, ...activeNews];
                    const infoItem = allInfo.find(i => slugify(i.title[language] || i.title.nl) === slug);

                    if (infoItem) {
                        setActiveInfoPage(infoItem);
                        setActivePerformance(null);
                        setActiveRoute(null);
                        setIsInitialLoad(false);
                        setShowStickyHeader(true);
                    } else {
                        const hash = window.location.hash.substring(1);
                        if (hash && hash !== '#') {
                            if (hash === 'favorites') handleViewChange('favorites');
                            else if (hash === 'friends-favorites') handleViewChange('friends-favorites');
                            else if (hash === 'more-info') handleViewChange('more-info');
                            else if (hash === 'accessibility') handleViewChange('accessibility');
                            else handleViewChange('timetable', decodeURIComponent(hash));
                        }
                    }
                }
            }
        } else {
            const hash = window.location.hash.substring(1);
            if (hash && hash !== '#') {
                if (hash === 'favorites') handleViewChange('favorites');
                else if (hash === 'friends-favorites') handleViewChange('friends-favorites');
                else if (hash === 'more-info') handleViewChange('more-info');
                else if (hash === 'accessibility') handleViewChange('accessibility');
                else handleViewChange('timetable', decodeURIComponent(hash));
            } else {
                try {
                    window.history.replaceState({ view: 'initial' }, '', window.location.pathname + '#');
                } catch(e) { console.warn("Could not update history state:", e); }
            }
        }

        // 3. BACKGROUND FETCH (Haal stilletjes de nieuwste data op)
        fetchDataFromAppwrite().then(() => {
            if (!hasCache) {
                // Als we nog geen cache hadden (eerste bezoeker), is de data nu binnen en stoppen we het laadscherm.
                setLoading(false); 
            }
            
            try {
                const dismissed = localStorage.getItem('ctfAppDownloadPopupDismissed');
                const isProbablyAndroid = /Android/i.test(navigator.userAgent);
                const isProbablyIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                if (!dismissed && (isProbablyAndroid || isProbablyIOS)) {
                    setTimeout(() => setShowAppDownloadPopup(true), 3000); 
                }
            } catch(e) {}
        });
    };

    init();

    const intervalId = setInterval(fetchDataFromAppwrite, 120000);

    return () => clearInterval(intervalId);
  }, []); 

  const handleImportFavorites = () => {
      const importedIds = new Set(sharedFavoritesForImport.map(p => p.id));
      setFriendsFavorites(importedIds);
      localStorage.setItem('ctfFriendsFavorites', JSON.stringify(Array.from(importedIds)));
      setShowImportPopup(false);
      setSharedFavoritesForImport([]);
      showMessageBox(translations[language].common.importSuccess);
      
      handleViewChange('friends-favorites');
  };

  const openSettingsWithFallback = useCallback(() => {
      try {
        if (window.AndroidBridge?.openExactAlarmSettings) {
            window.AndroidBridge.openExactAlarmSettings();
        } else if (window.AndroidBridge?.openAppSettings) {
            window.AndroidBridge.openAppSettings();
        }
      } catch (e) {
        console.error("Failed to open Android settings:", e);
      }
      closeMessageBox(); 
  }, [closeMessageBox]);
  
  const showPermissionDialog = useCallback(() => {
      showMessageBox(
        translations[language].common.exactAlarmPermissionNeededBody,
        [
          {
            text: translations[language].common.openSettings,
            onClick: openSettingsWithFallback,
            className: 'bg-[#20747f] hover:bg-[#1a5b64] text-white'
          },
          {
            text: translations[language].common.later,
            onClick: closeMessageBox,
            className: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }
        ],
        translations[language].common.exactAlarmPermissionNeededTitle
      );
  }, [language, showMessageBox, closeMessageBox, openSettingsWithFallback, translations]);

  useEffect(() => {
    const checkPermissionsOnLoad = async () => {
      try {
        if (window.AndroidBridge && !permissionRequestDismissed && !loading) {
          const canSchedule = await window.AndroidBridge.canScheduleExactAlarms();
          if (!canSchedule) {
            showMessageBox(
              translations[language].common.exactAlarmPermissionNeededBody,
              [
                {
                  text: translations[language].common.openSettings,
                  onClick: openSettingsWithFallback,
                  className: 'bg-[#20747f] hover:bg-[#1a5b64] text-white'
                },
                {
                  text: translations[language].common.dontAskAgain,
                  onClick: () => {
                    localStorage.setItem('ctfNotificationPermissionDismissed', 'true');
                    setPermissionRequestDismissed(true);
                    closeMessageBox();
                  },
                  className: 'bg-gray-500 hover:bg-gray-600 text-white'
                },
                {
                  text: translations[language].common.later,
                  onClick: closeMessageBox,
                  className: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }
              ],
              translations[language].common.exactAlarmPermissionNeededTitle
            );
          }
        }
      } catch (e) {
        console.error("Error checking Android permissions:", e);
      }
    };
    const timer = setTimeout(checkPermissionsOnLoad, 1000);
    return () => clearTimeout(timer);
  }, [loading, permissionRequestDismissed, language, showMessageBox, closeMessageBox, openSettingsWithFallback, translations]);

  const scheduleActualNotification = useCallback(async (item) => {
    try {
        const notificationTime = parseDateForSorting(item.date);
        if (isNaN(notificationTime.getTime()) || !item.time) return;

        const [h, m] = item.time.split(':');
        notificationTime.setHours(h, m, 0, 0);

        const reminderTime = new Date(notificationTime.getTime() - 20 * 60 * 1000);
        const now = new Date();
        const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;

        if (reminderTime <= now) {
            if (item.crowdLevel?.toLowerCase() === 'geannuleerd' || item.crowdLevel?.toLowerCase() === 'cancelled') {
                const title = translations[language].common.cancellationNotificationTitle;
                const body = translations[language].common.cancellationNotificationBody.replace('%s', fullTitle);
                if (window.AndroidBridge?.scheduleNativeNotification) {
                    const appUrl = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(item.event)}`;
                    window.AndroidBridge.scheduleNativeNotification(title, body, Date.now(), `cancellation-${item.id}`, appUrl);
                } else if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(title, { body });
                }
            }
            return;
        }

        const title = translations[language].common.notificationTitle;
        const body = translations[language].common.notificationBody.replace('%s', fullTitle).replace('%s', item.location);
        const notificationId = item.id;

        if (window.AndroidBridge?.scheduleNativeNotification) {
            const canSchedule = await window.AndroidBridge.canScheduleExactAlarms();
            if (!canSchedule) {
                if (!permissionRequestDismissed) showPermissionDialog();
                return;
            }
            window.AndroidBridge.scheduleNativeNotification(title, body, reminderTime.getTime(), notificationId, item.url || '');
        } else if ('Notification' in window && Notification.permission === 'granted') {
            const delay = reminderTime.getTime() - now.getTime();
            // FIX: setTimeout max limiet is ~24.8 dagen (2^31-1 ms). 
            // Als de delay groter is, vuurt hij direct. We negeren het als het te ver in de toekomst is.
            // De periodieke data-refresh pakt hem later wel op als hij dichterbij komt.
            const MAX_TIMEOUT = 2147483647; 

            if (delay > 0) {
                if (delay > MAX_TIMEOUT) {
                    // Te ver in de toekomst, plan nog niets in.
                    return;
                }

                if(notificationTimeouts.current[notificationId]) clearTimeout(notificationTimeouts.current[notificationId]);
                const timeoutId = setTimeout(() => {
                    new Notification(title, { body });
                    delete notificationTimeouts.current[notificationId];
                }, delay);
                notificationTimeouts.current[notificationId] = timeoutId;
            }
        }
    } catch (e) {
        console.error("Failed to schedule notification:", e);
    }
  }, [language, showPermissionDialog, permissionRequestDismissed, translations]);

  const cancelScheduledNotification = useCallback((performanceId) => {
    try {
        if (window.AndroidBridge?.cancelNativeNotification) {
            window.AndroidBridge.cancelNativeNotification(performanceId);
        }
        if (notificationTimeouts.current[performanceId]) {
            clearTimeout(notificationTimeouts.current[performanceId]);
            delete notificationTimeouts.current[performanceId];
        }
    } catch (e) {
        console.error("Failed to cancel notification:", e);
    }
  }, []);

  const scheduleStatusNotification = useCallback((item, type) => {
    try {
        let title, body;
        const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;

        if (type === 'cancelled') {
            title = translations[language].common.cancellationNotificationTitle;
            body = translations[language].common.cancellationNotificationBody.replace('%s', fullTitle);
        } else if (type === 'full') {
            title = translations[language].common.fullNotificationTitle;
            body = translations[language].common.fullNotificationBody.replace('%s', fullTitle);
        } else {
            return;
        }

        const notificationId = `${type}-${item.id}-${new Date().getTime()}`;
        const scheduleTime = Date.now() + 1000; 

        if (window.AndroidBridge?.scheduleNativeNotification) {
            const appUrl = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(item.event)}`;
            window.AndroidBridge.scheduleNativeNotification(title, body, scheduleTime, notificationId, appUrl);
        } else if ('Notification' in window && Notification.permission === 'granted') {
            setTimeout(() => {
                new Notification(title, { body, tag: notificationId });
            }, 1000);
        }
    } catch (e) {
        console.error("Failed to schedule status notification:", e);
    }
  }, [language, translations]);

  useEffect(() => {
    if (loading || prevTimetableDataRef.current.length === 0 || favorites.size === 0) {
        return;
    }

    const prevDataMap = new Map(prevTimetableDataRef.current.map(item => [item.id, item]));
    const favoritesToRemove = new Set();

    favorites.forEach(favId => {
        const currentItem = timetableData.find(item => item.id === favId);
        const prevItem = prevDataMap.get(favId);

        if (currentItem && prevItem) {
            const currentStatus = currentItem.crowdLevel?.toLowerCase();
            const prevStatus = prevItem.crowdLevel?.toLowerCase();

            if (currentStatus !== prevStatus) {
                if (currentStatus === 'geannuleerd' || currentStatus === 'cancelled') {
                    scheduleStatusNotification(currentItem, 'cancelled');
                    cancelScheduledNotification(currentItem.id);
                    favoritesToRemove.add(favId);
                }
                if (currentStatus === 'vol' || currentStatus === 'full') {
                    scheduleStatusNotification(currentItem, 'full');
                    cancelScheduledNotification(currentItem.id);
                    favoritesToRemove.add(favId);
                }
            }
        }
    });

    if (favoritesToRemove.size > 0) {
        setFavorites(prevFavorites => {
            const newFavorites = new Set(prevFavorites);
            favoritesToRemove.forEach(id => newFavorites.delete(id));
            localStorage.setItem('ctfTimetableFavorites', JSON.stringify([...newFavorites]));
            return newFavorites;
        });
    }
  }, [timetableData, favorites, loading, scheduleStatusNotification, cancelScheduledNotification]);

  useEffect(() => {
      prevTimetableDataRef.current = timetableData;
  }, [timetableData]);
  
  const processAndScheduleGeneralNotifications = useCallback(async (notifications) => {
    try {
        if (!Array.isArray(notifications)) {
            console.error("General notifications data is not an array:", notifications);
            return;
        }

        let hasPermission = true;
        if (window.AndroidBridge) {
            hasPermission = await window.AndroidBridge.canScheduleExactAlarms();
            if (!hasPermission && !permissionRequestDismissed) {
                showPermissionDialog();
                return;
            }
        } else if (!('Notification' in window) || Notification.permission !== 'granted') {
            hasPermission = false;
        }

        const newlyScheduledIds = new Set();
        const now = new Date();
        const MAX_TIMEOUT = 2147483647; // FIX: Max timeout limiet

        for (const notif of notifications) {
            if (!notif.id || !notif.date) continue;
            if (scheduledCustomNotifications.has(notif.id)) continue;
            const notificationDateTime = new Date(notif.date);
            if (isNaN(notificationDateTime.getTime()) || notificationDateTime <= now) continue;
            if (!hasPermission) continue;

            const title = translations[language].common.genericNotificationTitle;
            const body = language === 'nl' ? notif.text_nl : notif.text_en;
            if (!body) continue;
            
            if (window.AndroidBridge?.scheduleNativeNotification) {
                window.AndroidBridge.scheduleNativeNotification(title, body, notificationDateTime.getTime(), notif.id, notif.url || '');
            } else {
                const delay = notificationDateTime.getTime() - now.getTime();
                
                // FIX: Check voor max timeout
                if (delay > MAX_TIMEOUT) {
                    continue; // Skip als het te ver in de toekomst is
                }

                setTimeout(() => { new Notification(title, { body }); }, delay);
            }
            newlyScheduledIds.add(notif.id);
        }

        if (newlyScheduledIds.size > 0) {
            setScheduledCustomNotifications(prev => {
                const newSet = new Set([...prev, ...newlyScheduledIds]);
                localStorage.setItem('ctfScheduledCustomNotifications', JSON.stringify([...newSet]));
                return newSet;
            });
        }
    } catch (e) {
        console.error("Failed to process general notifications:", e);
    }
  }, [language, scheduledCustomNotifications, permissionRequestDismissed, showPermissionDialog, translations]);

  useEffect(() => {
    const gistNotificationsUrl = 'https://ldegroen.github.io/ctf-notificaties/notifications.json'; 
    const fetchAndProcessGistNotifications = async () => {
      if (!gistNotificationsUrl) return;
      try {
        const response = await fetch(gistNotificationsUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();
        processAndScheduleGeneralNotifications(json);
      } catch (err) {
        console.error("Error fetching or processing Gist notifications:", err);
      }
    };
    if (!loading) fetchAndProcessGistNotifications();
  }, [loading, processAndScheduleGeneralNotifications]);

  useEffect(() => {
    if (selectedEvent && eventInfoMap[selectedEvent]) {
      const info = eventInfoMap[selectedEvent];
      setCurrentSponsorInfo({ logoUrl: info.sponsorLogo || '', eventName: selectedEvent });
    } else {
      setCurrentSponsorInfo(null);
    }
  }, [selectedEvent, eventInfoMap]);

  const datesForCurrentSelectedEvent = useMemo(() => {
    if (currentView !== 'timetable' || !selectedEvent) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let eventPerformances = timetableData.filter(item => {
        if (item.event !== selectedEvent || !item.date) return false;
        
        const performanceDate = parseDateForSorting(item.date);
        
        return performanceDate && performanceDate >= today;
    });

    const filtersAreActive = iconFilters.size > 0 || genreFilters.size > 0;
    if (filtersAreActive) {
        eventPerformances = eventPerformances.filter(item => {
            const hasIconMatch = iconFilters.size === 0 || [...iconFilters].every(filterKey => item.safetyInfo[filterKey]);
            const hasGenreMatch = genreFilters.size === 0 || (item.genre && item.genre.split(',').map(g => g.trim()).some(g => genreFilters.has(g)));
            return hasIconMatch && hasGenreMatch;
        });
    }

    // Filter Utrecht Centraal shows uit de datumlijst (die hebben hun eigen knop)
    eventPerformances = eventPerformances.filter(item => 
        !(item.location && item.location.toLowerCase().includes('utrecht centraal'))
    );

    return [...new Set(eventPerformances.map(item => item.date))]
           .sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));
  }, [timetableData, selectedEvent, currentView, iconFilters, genreFilters]);


  const toggleFavorite = useCallback((itemObject, e) => {
    e.stopPropagation();
    
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemObject.id)) {
        newFavorites.delete(itemObject.id);
        cancelScheduledNotification(itemObject.id);
      } else {
        newFavorites.add(itemObject.id);
        scheduleActualNotification(itemObject);
      }
      
      localStorage.setItem('ctfTimetableFavorites', JSON.stringify([...newFavorites]));

      if (window.AndroidBridge && window.AndroidBridge.saveFavoritesForReboot) {
        const favoritesToSave = [...newFavorites].map(favId => timetableData.find(item => item.id === favId)).filter(Boolean);
        window.AndroidBridge.saveFavoritesForReboot(JSON.stringify(favoritesToSave));
      }
      
      return newFavorites;
    });
  }, [scheduleActualNotification, cancelScheduledNotification, timetableData]);

  // NIEUW: Functie voor hele routes
  const toggleRouteFavorites = useCallback((route) => {
      if (!route || !route.executionIds) return;

      const idsToAdd = route.executionIds;
      const allFavorited = idsToAdd.every(id => favorites.has(id));

      setFavorites(prev => {
          const newFavorites = new Set(prev);
          
          idsToAdd.forEach(id => {
              const item = timetableData.find(p => p.id === id);
              if (item) {
                  if (allFavorited) {
                      newFavorites.delete(id);
                      cancelScheduledNotification(id);
                  } else {
                      if (!newFavorites.has(id)) {
                          newFavorites.add(id);
                          scheduleActualNotification(item);
                      }
                  }
              }
          });

          localStorage.setItem('ctfTimetableFavorites', JSON.stringify([...newFavorites]));
           if (window.AndroidBridge && window.AndroidBridge.saveFavoritesForReboot) {
                const favoritesToSave = [...newFavorites].map(favId => timetableData.find(item => item.id === favId)).filter(Boolean);
                window.AndroidBridge.saveFavoritesForReboot(JSON.stringify(favoritesToSave));
           }
          return newFavorites;
      });
      
      showMessageBox(allFavorited 
        ? translations[language].common.routeRemoved 
        : translations[language].common.routeAdded
      );

  }, [favorites, timetableData, scheduleActualNotification, cancelScheduledNotification, showMessageBox, language, translations]);

  useEffect(() => {
    if (timetableData.length > 0 && favorites.size > 0) {
        const dataMap = new Map(timetableData.map(item => [item.id, item]));
        favorites.forEach(favId => {
            const item = dataMap.get(favId);
            if (item) {
                scheduleActualNotification(item);
            }
        });
    }
  }, [timetableData, favorites, scheduleActualNotification]);

  const addToGoogleCalendar = useCallback((e, title, date, time, location) => {
    e.stopPropagation();
    const dateObj = parseDateForSorting(date);
    if (isNaN(dateObj.getTime()) || !time) {
      console.error("Invalid date or time for calendar event:", date, time);
      return;
    }
    
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    
    const [startHour, startMinute] = time.split(':').map(Number);
    
    const startDate = new Date(year, month, day, startHour, startMinute);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    const formatForGoogle = (d) => {
        const yyyy = d.getFullYear(); 
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const DD = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${yyyy}${MM}${DD}T${hh}${mm}${ss}`; 
    };

    const startDateString = formatForGoogle(startDate);
    const endDateString = formatForGoogle(endDate);
    
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDateString}/${endDateString}&ctz=${timezone}&details=${encodeURIComponent('Locatie: ' + location)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;
    window.open(url, '_blank');
  }, []);

  const handleIconMouseEnter = useCallback((e, content) => {
    setCustomTooltipContent(content);
    setCustomTooltipPosition({ x: e.clientX + 15, y: e.clientY + 15 });
    setShowCustomTooltip(true);
  }, []);

  const handleIconMouseLeave = useCallback(() => setShowCustomTooltip(false), []);
  
  const handleCookieChoice = (choice) => {
    localStorage.setItem('cookieConsent', choice);
    setCookieConsent(choice);
    if (choice === 'all' && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
        try {
            ReactGA.initialize(GA_MEASUREMENT_ID);
            console.log("Marketing en analytics cookies zijn nu ingeschakeld en GA is geïnitialiseerd.");
            trackEvent('Cookie Consent', 'Accept All', '');
        } catch(e) {
            console.error("Fout bij initialiseren Google Analytics na cookie keuze:", e);
        }
    } else if (choice === 'functional') {
        trackEvent('Cookie Consent', 'Accept Functional', '');
    } else if (choice === 'declined') {
        trackEvent('Cookie Consent', 'Decline All', '');
    }
  };
  
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.key === 'Escape') {
        const isModalOpen = showPopup || showPrivacyPolicy || messageBoxConfig.show || showExportModal || showImportPopup;
        if (!isModalOpen && (!isInitialLoad || activePerformance || activeInfoPage || activeRoute)) {
          returnToInitialView();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showPopup, showPrivacyPolicy, messageBoxConfig.show, showExportModal, showImportPopup, isInitialLoad, activePerformance, activeInfoPage, activeRoute, returnToInitialView]);

  const renderMainContent = () => {
      if (activeInfoPage) {
          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <InfoDetailPage
                      item={activeInfoPage}
                      language={language}
                      translations={translations}
                  />
              </div>
          );
      }

      if (activeRoute) {
          const routeTitle = language === 'nl' ? activeRoute.title : (activeRoute.titleEng || activeRoute.title);
          const routeText = language === 'nl' ? activeRoute.text : (activeRoute.textEng || activeRoute.text);
          const routePerformances = timetableData.filter(p => activeRoute.executionIds.includes(p.id))
                .sort((a, b) => parseDateForSorting(a.date) - parseDateForSorting(b.date) || a.time.localeCompare(b.time));

          // NIEUW: Groepeer route-voorstellingen op datum
          const groupedByDate = routePerformances.reduce((acc, item) => {
             (acc[item.date] = acc[item.date] || []).push(item);
             return acc;
          }, {});

          const subGroups = Object.keys(groupedByDate)
             .sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b))
             .map(date => ({
                 subGroupTitle: date,
                 items: groupedByDate[date].sort((a, b) => a.time.localeCompare(b.time))
             }));

          const isRouteFavorited = activeRoute.executionIds.length > 0 && activeRoute.executionIds.every(id => favorites.has(id));

          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'} pb-20`}>
                  <div className="max-w-4xl mx-auto text-white mb-8">
                      {activeRoute.image && (
                          <img src={activeRoute.image} alt={routeTitle} className="w-full h-64 md:h-96 object-cover rounded-xl shadow-lg mb-6" />
                      )}
                      <h2 className="text-3xl font-bold mb-4 text-center">{routeTitle}</h2>
                      <div className="prose prose-invert max-w-none mb-6 text-center">
                         <p>{routeText}</p>
                      </div>
                      
                      <div className="flex justify-center mb-8">
                          <button 
                            onClick={() => toggleRouteFavorites(activeRoute)}
                            className={`px-6 py-3 rounded-lg font-bold text-lg shadow-lg flex items-center gap-2 transition-transform hover:scale-105 ${isRouteFavorited ? 'bg-red-500 text-white' : 'bg-white text-[#20747f]'}`}
                          >
                             <svg xmlns="https://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                             </svg>
                             {isRouteFavorited ? translations[language].common.removeRouteFromFavorites : translations[language].common.addRouteToFavorites}
                          </button>
                      </div>
                  </div>

                  <TimetableDisplay 
                      loading={false} 
                      error={null} 
                      displayedData={[{ groupTitle: routeTitle, subGroups: subGroups }]} 
                      currentView="route-detail" 
                      favorites={favorites} 
                      toggleFavorite={toggleFavorite} 
                      addToGoogleCalendar={addToGoogleCalendar} 
                      openContentPopup={openContentPopup} 
                      language={language} 
                      handleIconMouseEnter={handleIconMouseEnter} 
                      handleIconMouseLeave={handleIconMouseLeave} 
                      translations={translations} 
                      selectedEvent={null} 
                      searchTerm="" 
                      showMessageBox={showMessageBox} 
                      selectedDate={null} 
                      safetyIcons={safetyIcons} 
                      onNavigate={handleNavigateToPerformance}
                      onReservationClick={openReservationModal} // <--- 4. Zorg dat deze erbij staat
                  />
              </div>
          );
      }

      if (activePerformance) {
          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <PerformanceDetailPage
                      performance={activePerformance}
                      allPerformances={timetableData}
                      language={language}
                      translations={translations}
                      onNavigateToEvent={(view, event) => handleViewChange(view, event)}
                      onReservationClick={openReservationModal}
                  />
              </div>
          );
      }
      
      if (loading && isInitialLoad) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
      }
      
      if (currentView === 'more-info') {
          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <MoreInfoPage
                      generalInfoItems={generalInfoData}
                      openContentPopup={openContentPopup}
                      language={language}
                      translations={translations}
                  />
              </div>
          );
      }
      
      if (currentView === 'accessibility') {
          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <AccessibilityPage
                      accessibilityInfoItems={accessibilityInfoData}
                      openContentPopup={openContentPopup}
                      language={language}
                      translations={translations}
                  />
              </div>
          );
      }
      
      const isFavorites = currentView === 'favorites';
      const isFriendsFavorites = currentView === 'friends-favorites';

      let currentViewMode = 'card';
      let setViewModeFunction = () => {};
      if (isFavorites) {
        currentViewMode = favoritesViewMode;
        setViewModeFunction = setFavoritesViewMode;
      } else if (isFriendsFavorites) {
        currentViewMode = friendsFavoritesViewMode;
        setViewModeFunction = setFriendsFavoritesViewMode;
      } else if (currentView === 'timetable') {
        currentViewMode = eventViewMode;
        setViewModeFunction = setEventViewMode;
      }
      
      return (
        <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
          {(selectedEvent || isFavorites || isFriendsFavorites) && (
              <>
                {currentView === 'friends-favorites' && friendsFavorites.size > 0 ? (
                    <div className="flex flex-col items-center justify-center mt-12 mb-8 text-center">
                        <button 
                            onClick={handleClearFriendsFavorites} 
                            className="px-6 py-3 bg-[#1a5b64] text-white rounded-lg shadow-md hover:bg-[#2e9aaa] transition-all duration-200 text-base font-semibold"
                        >
                            {translations[language].common.removeFriendsFavorites}
                        </button>
                    </div>
                ) : (
                    <SponsorDisplay ref={sponsorRef} sponsorInfo={currentSponsorInfo} language={language} translations={translations} />
                )}
                
                {currentView === 'timetable' && !searchTerm && eventViewMode === 'card' && (
                    <DateNavigation datesForCurrentSelectedEvent={datesForCurrentSelectedEvent} selectedDate={selectedDate} setSelectedDate={setSelectedDate} setSearchTerm={setSearchTerm} translations={translations} language={language} selectedEvent={selectedEvent} timetableData={timetableData} />
                )}

                {(isFavorites || isFriendsFavorites || (currentView === 'timetable' && selectedEvent)) && (
                    <div className="flex flex-col items-center gap-4 my-8 w-full">
                        <div className="flex flex-wrap justify-center items-center gap-4">
                            <EventViewSwitcher 
                                viewMode={currentViewMode} 
                                setViewMode={setViewModeFunction}
                                language={language} 
                                translations={translations} 
                                handleAnimatedUpdate={handleAnimatedUpdate}
                                hasRoutes={currentView === 'timetable' && selectedEvent && routesData.some(r => r.event === selectedEvent)}
                                
                                onOpenRoutes={() => {
                                    const eventRoutes = routesData.filter(r => r.event === selectedEvent);
                                    const allDates = new Set();
                                    eventRoutes.forEach(r => {
                                        if (r.dates && Array.isArray(r.dates)) {
                                            r.dates.forEach(d => allDates.add(d));
                                        }
                                    });
                                    const uniqueDates = Array.from(allDates).sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));

                                    const openRouteList = (filteredRoutes) => {
                                        openContentPopup('routeSelection', { 
                                            routes: filteredRoutes, 
                                            onSelectRoute: (route) => {
                                                closePopup(); 
                                                handleAnimatedUpdate(() => {
                                                    setActiveRoute(route); 
                                                    window.scrollTo({ top: 0, behavior: 'auto' });
                                                });
                                            }
                                        });
                                    };

                                    if (uniqueDates.length > 0) {
                                        openContentPopup('routeDateSelection', {
                                            dates: uniqueDates,
                                            onSelectDate: (selectedDate) => {
                                                const routesForDate = eventRoutes.filter(r => r.dates && r.dates.includes(selectedDate));
                                                openRouteList(routesForDate);
                                            }
                                        });
                                    } else {
                                        openRouteList(eventRoutes);
                                    }
                                }}
                            />
                      {isFavorites && favorites.size > 0 && (
                        <button onClick={() => {
                            setShowExportModal(true);
                            trackEvent('Sharing', 'Open Export Modal', '');
                        }} className="px-4 py-2 rounded-lg font-semibold bg-green-500 hover:bg-green-600 text-white flex items-center gap-2">
                             <svg xmlns="https://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                             {translations[language].common.exportFavorites}
                        </button>
                      )}
                        </div>
                        
                        {/* NIEUW: Hoe werkt Pay What You Can knop */}
                        {currentView === 'timetable' && selectedEvent && (
                            <button
                                onClick={() => openContentPopup('text', {
                                    title: translations[language].payWhatYouCan.title,
                                    text: translations[language].payWhatYouCan.text
                                })}
                                className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 bg-[#9f4493] text-black shadow-md hover:opacity-80 flex items-center gap-2"
                            >
                                <svg xmlns="https://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                {translations[language].common.howPWYCWorks}
                            </button>
                        )}
                    </div>
                )}
                
                {currentViewMode === 'card' ? (
                   <TimetableDisplay 
                      loading={loading && !isInitialLoad} 
                      error={error} 
                      displayedData={formattedData} 
                      currentView={currentView} 
                      favorites={favorites} 
                      toggleFavorite={toggleFavorite} 
                      addToGoogleCalendar={addToGoogleCalendar} 
                      openContentPopup={openContentPopup} 
                      language={language} 
                      handleIconMouseEnter={handleIconMouseEnter} 
                      handleIconMouseLeave={handleIconMouseLeave} 
                      translations={translations} 
                      selectedEvent={selectedEvent} 
                      searchTerm={searchTerm} 
                      showMessageBox={showMessageBox} 
                      selectedDate={selectedDate} 
                      safetyIcons={safetyIcons} 
                      iconFilters={iconFilters}
                      genreFilters={genreFilters}
                      onNavigate={handleNavigateToPerformance}
                      onReservationClick={openReservationModal}
                  />
                ) : (
                   <BlockTimetable allData={timetableData} favorites={favorites} friendsFavorites={friendsFavorites} toggleFavorite={toggleFavorite} selectedEvent={selectedEvent} openContentPopup={openContentPopup} translations={translations} language={language} isFavoritesView={isFavorites} isFriendsView={isFriendsFavorites} />
                )}
                
                {currentView !== 'block' && selectedEvent && eventInfoMap[selectedEvent]?.mapUrl && !loading && !error && (
                    <div className="mt-8 mb-8 w-full max-w-sm px-4 cursor-pointer mx-auto" onClick={() => {
                        openContentPopup('image', eventInfoMap[selectedEvent].mapUrl);
                        trackEvent('Navigation', 'Open Map', selectedEvent);
                    }}>
                        <h2 className="text-center text-white text-2xl font-bold mb-4">{translations[language].common.mapTitle.replace('%s', selectedEvent)}</h2>
                        <img src={eventInfoMap[selectedEvent].mapUrl} alt={`Afbeelding van Kaart ${selectedEvent}`} className="w-full h-auto rounded-lg shadow-lg border-4 border-white/50 hover:border-white transition-all"/>
                    </div>
                )}
              </>
          )}
        </div>
      )
  }

  const handleClearFriendsFavorites = useCallback(() => {
      setFriendsFavorites(new Set());
      localStorage.removeItem('ctfFriendsFavorites');
      returnToInitialView();
  }, [returnToInitialView]);


  const handleStickyLogoClick = useCallback(() => {
    returnToInitialView();
  }, [returnToInitialView]);

  useEffect(() => {
      const handlePopState = (event) => {
          const path = window.location.pathname;
          const pathSegments = path.split('/').filter(Boolean);
          
          if (pathSegments.length > 0) {
              const slug = pathSegments[0];
              const performance = timetableData.find(p => slugify(p.artist || p.title) === slug);
              
              if (performance) {
                  setActivePerformance(performance);
                  setActiveInfoPage(null);
                  setIsInitialLoad(false);
                  setShowStickyHeader(true);
              } else {
                  const allInfo = [...generalInfoData, ...accessibilityInfoData, ...newsData];
                  const infoItem = allInfo.find(i => slugify(i.title[language] || i.title.nl) === slug);
                  
                  if (infoItem) {
                       setActiveInfoPage(infoItem);
                       setActivePerformance(null);
                       setIsInitialLoad(false);
                       setShowStickyHeader(true);
                  } else {
                       returnToInitialView();
                  }
              }
          } else if (!event.state || event.state.view === 'initial' || !window.location.hash) {
              returnToInitialView();
          } else if (event.state.view === 'detail') {
              handleAnimatedUpdate(() => {
                setActivePerformance(null);
                setActiveInfoPage(null);
                setIsInitialLoad(false);
                setCurrentView(event.state.currentView || 'timetable');
                setSelectedEvent(event.state.event);
                if(event.state.currentView === 'timetable') setEventViewMode(event.state.viewMode || 'card');
                setShowStickyHeader(true);
              });
          }
      };

      window.addEventListener('popstate', handlePopState);
      
      return () => {
          window.removeEventListener('popstate', handlePopState);
      };
  }, [returnToInitialView, handleAnimatedUpdate, timetableData, generalInfoData, accessibilityInfoData, newsData, handleViewChange, language]);

  useEffect(() => {
    const scriptId = 'react-ga4-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://cdn.jsdelivr.net/npm/react-ga4@2.1.0/dist/react-ga4.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <>
    <style>{`
        #app-container.grayscale { filter: grayscale(100%); }
        #app-container.high-contrast { filter: contrast(175%); }
        #app-container.negative-contrast { filter: invert(100%) hue-rotate(180deg); }
        #app-container.negative-contrast img { filter: invert(100%) hue-rotate(180deg); }
        #app-container.underline-links a, #app-container.underline-links button { text-decoration: underline !important; }
        #app-container.readable-font { font-family: 'Arial', sans-serif !important; }
        #app-container.readable-font h1, #app-container.readable-font h2, #app-container.readable-font h3 { font-family: 'Arial', sans-serif !important; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
        
        /* NIEUWE ANIMATIE: Fade In Up */
        @keyframes fadeInUp {
            from { 
                opacity: 0; 
                transform: translateY(20px); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0); 
            }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
    `}</style>
    <div id="app-container" className="min-h-screen bg-[#20747f] font-sans text-gray-100 flex flex-col items-center relative overflow-x-hidden">
      
      <StickyHeader 
          isVisible={showStickyHeader || !!activePerformance || !!activeInfoPage || !!activeRoute} 
          uniqueEvents={uniqueEvents} 
          handleEventClick={(e) => handleViewChange('timetable', e)} 
          handleFavoritesClick={() => handleViewChange('favorites')} 
          handleFriendsFavoritesClick={() => handleViewChange('friends-favorites')}
          handleMoreInfoClick={() => handleViewChange('more-info')}
          handleAccessibilityClick={() => handleViewChange('accessibility')}
          hasFriendsFavorites={friendsFavorites.size > 0}
          onLogoClick={handleStickyLogoClick} 
          selectedEvent={selectedEvent} 
          currentView={currentView} 
          language={language} 
          handleLanguageChange={handleLanguageChange} 
          translations={translations} 
          openContentPopup={openContentPopup}
          isInitialLoad={isInitialLoad && !activePerformance && !activeInfoPage && !activeRoute}
      />
      
      <OfflineIndicator 
        isOffline={isOffline} 
        language={language} 
        translations={translations} 
        onRetry={fetchDataFromAppwrite}
      />
      
      <div className="w-full flex-grow flex flex-col">
          <div className="relative min-h-[95vh]">
            <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${isInitialLoad && !activePerformance && !activeInfoPage && !activeRoute ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
              <div className="w-full flex flex-col items-center p-4 sm:p-6 md:p-8">
                <div className={`fixed inset-x-0 bottom-0 z-0 transition-opacity duration-700 ${isInitialLoad ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  {/* Achtergrond campagnebeeld */}
                  <div className="relative w-full max-w-md mx-auto translate-y-24">
                    <img src="https://media.cafetheaterfestival.nl/wp-content/uploads/2025/12/CafeI-theater-festival-2026-met-blauwe-verfklodderpng-scaled.png" alt="Afbeelding van campagnebeeld Café Theater Festival" className="w-full h-auto pointer-events-none" />
                  </div>
                  
                  {/* Decoratieve figuren voor landingspagina */}
                  <img 
                      src={landingFigures[0]} 
                      className="hidden md:block absolute left-12 bottom-0 h-[30vh] w-auto object-contain pointer-events-none drop-shadow-2xl transition-transform duration-1000 ease-out translate-y-10" 
                      alt="Decoratief figuur links"
                  />
                  <img 
                      src={landingFigures[1]} 
                      className="hidden md:block absolute right-12 bottom-0 h-[35vh] w-auto object-contain pointer-events-none drop-shadow-2xl transition-transform duration-1000 ease-out translate-y-10" 
                      alt="Decoratief figuur rechts"
                  />
                </div>
                <div className="relative z-10 w-full">
                  <div className="absolute top-4 left-4 sm:top-12 flex flex-col space-y-2 items-start sm:flex-row sm:space-y-0 sm:space-x-2 sm:items-center">
                      <button
                        onClick={() => openContentPopup('iframe', 'https://stamgast.cafetheaterfestival.nl/')}
                        className="px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold bg-[#78b5e3]/90 text-black hover:bg-[#9f4493]/90 transition-colors duration-200 text-sm sm:text-base"
                        tabIndex="0"
                      >
                        <span className="sm:hidden">{translations[language].common.becomeRegularGuestShort}</span>
                        <span className="hidden sm:inline">{translations[language].common.becomeStamgastButton}</span>
                      </button>
                  </div>
                  <TopRightControls 
                    language={language} 
                    handleLanguageChange={handleLanguageChange} 
                    translations={translations}
                  />
                  
                  <AppHeader translations={translations} language={language} titleRef={titleRef} />
                  {!loading && (
                    <div>
                      <EventNavigation 
                          onEventSelect={(e) => handleViewChange('timetable', e)} 
                          onFavoritesSelect={() => handleViewChange('favorites')} 
                          onFriendsFavoritesSelect={() => handleViewChange('friends-favorites')}
                          onMoreInfoSelect={() => handleViewChange('more-info')}
                          onAccessibilitySelect={() => handleViewChange('accessibility')}
                          
                          // --- HIER IS DE NIEUWE LOGICA ---
                          onHelpChoosingSelect={() => {
                                // 1. Filter events met routes
                                const eventsWithRoutes = uniqueEvents.filter(evt => routesData.some(r => r.event === evt));
                                
                                // 2. Open Event Selectie Popup
                                openContentPopup('helpChoosingEventSelection', {
                                    events: eventsWithRoutes,
                                    onSelectEvent: (chosenEvent) => {
                                        // 3. Event gekozen, start route logica voor dat event
                                        const eventRoutes = routesData.filter(r => r.event === chosenEvent);

                                        const allDates = new Set();
                                        eventRoutes.forEach(r => {
                                            if (r.dates && Array.isArray(r.dates)) {
                                                r.dates.forEach(d => allDates.add(d));
                                            }
                                        });
                                        const uniqueDates = Array.from(allDates).sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));

                                        const openRouteList = (filteredRoutes) => {
                                            openContentPopup('routeSelection', { 
                                                routes: filteredRoutes, 
                                                onSelectRoute: (route) => {
                                                    closePopup(); 
                                                    handleAnimatedUpdate(() => {
                                                        setSelectedEvent(chosenEvent); // Update context!
                                                        setActiveRoute(route); 
                                                        setIsInitialLoad(false); // <--- DEZE REGEL WAS CRUCIAAL
                                                        setShowStickyHeader(true);
                                                        window.scrollTo({ top: 0, behavior: 'auto' });
                                                    });
                                                }
                                            });
                                        };

                                        if (uniqueDates.length > 0) {
                                            openContentPopup('routeDateSelection', {
                                                dates: uniqueDates,
                                                onSelectDate: (selectedDate) => {
                                                    const routesForDate = eventRoutes.filter(r => r.dates && r.dates.includes(selectedDate));
                                                    openRouteList(routesForDate);
                                                }
                                            });
                                        } else {
                                            openRouteList(eventRoutes);
                                        }
                                    }
                                });
                          }}
                          // --------------------------------
                          
                          hasFriendsFavorites={friendsFavorites.size > 0}
                          uniqueEvents={uniqueEvents} 
                          language={language} 
                          translations={translations}
                          eventInfoMap={eventInfoMap}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${isInitialLoad && !activePerformance && !activeInfoPage && !activeRoute ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
               <div id="main-content-area" className={`w-full h-full overflow-y-auto p-4 sm:p-6 md:p-8 ${showStickyHeader || activePerformance || activeInfoPage || activeRoute ? 'pt-24 sm:pt-20' : ''}`}>
                {renderMainContent()}
              </div>
            </div>
          </div>
          
          <div ref={newsSectionRef}>
             <NewsPage
                newsItems={newsData}
                openContentPopup={openContentPopup}
                language={language}
                translations={translations}
             />
          </div>
          
          <AppFooter logos={benefactorLogos} language={language} translations={translations} setShowPrivacyPolicy={setShowPrivacyPolicy} />
      </div>
      <PopupModal 
        showPopup={showPopup} 
        closePopup={closePopup} 
        popupContent={popupContent} 
        language={language} 
        translations={translations} 
        allPerformances={timetableData} 
        openContentPopup={openContentPopup}
        onReservationClick={openReservationModal}
      />
      <PrivacyPolicyModal showPrivacyPolicy={showPrivacyPolicy} setShowPrivacyPolicy={setShowPrivacyPolicy} language={language} renderPrivacyPolicyContent={renderPrivacyPolicyContent} translations={translations} />
      <CustomTooltip showCustomTooltip={showCustomTooltip} customTooltipContent={customTooltipContent} customTooltipPosition={customTooltipPosition} />
      <ReservationModal 
        show={showReservationModal} 
        onClose={() => setShowReservationModal(false)} 
        performance={reservationPerformance} 
        language={language} 
        translations={translations}
        onSuccess={handleReservationSuccess} 
    />
      <MessageBox show={messageBoxConfig.show} title={messageBoxConfig.title} message={messageBoxConfig.message} buttons={messageBoxConfig.buttons} />
      <ExportModal 
        show={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onExport={handleExport}
        language={language} 
        translations={translations[language]} 
        isExporting={isExporting}
        showImageExportOption={favoritesViewMode === 'block'}
      />
      <ImportFavoritesModal 
        show={showImportPopup}
        onClose={() => setShowImportPopup(false)}
        onImport={handleImportFavorites}
        performances={sharedFavoritesForImport}
        language={language}
        translations={translations[language]}
      />
      
      {!isInitialLoad && !activePerformance && !activeInfoPage && currentView !== 'opencall' && (
        <SearchFilterNudges
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            genreFilters={genreFilters}
            setGenreFilters={setGenreFilters}
            allGenres={allGenres}
            iconFilters={iconFilters}
            setIconFilters={setIconFilters}
            filterScope={filterScope}
            setFilterScope={setFilterScope}
            safetyIcons={safetyIcons}
            language={language}
            translations={translations}
        />
      )}
      
      {cookieConsent === null && (
        <CookieConsentPopup
            onAcceptAll={() => handleCookieChoice('all')}
            onAcceptFunctional={() => handleCookieChoice('functional')}
            onDecline={() => handleCookieChoice('declined')}
            language={language}
            translations={translations}
        />
      )}

      <AppDownloadPopup 
        show={showAppDownloadPopup}
        onClose={handleCloseAppDownloadPopup}
        language={language}
        translations={translations}
      />

      {exportConfig && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0, backgroundColor: '#20747f', padding: '20px' }}>
              {exportConfig.type === 'card' ? (
                  <TimetableDisplay
                      ref={exportCardViewRef}
                      isExportMode={true}
                      displayedData={favoritesDataForExport}
                      currentView="favorites"
                      favorites={favorites}
                      language={language}
                      translations={translations}
                      safetyIcons={safetyIcons}
                      toggleFavorite={() => {}}
                      addToGoogleCalendar={() => {}}
                      openContentPopup={() => {}}
                      handleIconMouseEnter={() => {}}
                      handleIconMouseLeave={() => {}}
                      showMessageBox={() => {}}
                      onNavigate={() => {}}
                      onReservationClick={() => {}}
                  />
              ) : (
                  <BlockTimetable
                      ref={exportBlockViewRef}
                      isExportMode={true}
                      allData={timetableData}
                      favorites={favorites}
                      isFavoritesView={true}
                      isFriendsView={false}
                      friendsFavorites={friendsFavorites}
                      language={language}
                      translations={translations}
                      toggleFavorite={() => {}}
                      openContentPopup={() => {}}
                  />
              )}
          </div>
      )}
    </div>
    </>
  );
};

// De uiteindelijke App component die de ErrorBoundary om de content wikkelt
const App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App