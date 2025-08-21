import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Client, Databases, Query } from 'appwrite';

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
    }
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


// ========= WIJZIGING: Robuustere datum-parsering om sorteerfouten te voorkomen =========
const parseDateForSorting = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return new Date(NaN);
  
  const trimmedDateString = dateString.trim();

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
      back: 'Terug'
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
        'Absurdistisch': 'Absurdistisch', 'Circus': 'Circus'
    },
    payWhatYouCan: {
      title: "Pay What You Can",
      text: `Bij het CTF hoef je nooit een kaartje te kopen of een plekje te reserveren! We vinden dat belangrijk omdat we in cafés spelen, en juist ook de mensen die niet voor de voorstelling komen willen uitnodigen te blijven zitten en de voorstelling mee te maken. Toch vragen we het publiek om ook financieel bij tedragen aan het festival en de makers. Dat doen we met ons **Pay What You Can** systeem.\n\nNa de voorstelling komen de makers langs om te vragen om een financiële bijdrage van **€6,-, €8,-, of €10,- euro.** We hanteren verschillende bedragen omdat we er willen zijn voor bezoekers met een kleine én een grote portemonnee. Je kunt bij het CTF altijd met PIN, of via een QR-code met Tikkie betalen.`
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
    privacyPolicyContent: `**Privacybeleid voor de Café Theater Festival webapp**\n\n*Laatst bijgewerkt: 30 juni 2025*\n\nWelkom bij de Café Theater Festival webapp. Deze app is ontworpen om u te helpen de timetable van het festival te bekijken, voorstellingen als favoriet te markeren, herinneringen in te stellen en evenementen aan uw agenda toe te voegen.\n\nUw privacy is belangrijk voor ons. Dit privacybeleid beschrijft hoe wij informatie verzamelen, gebruiken en beschermen wanneer u onze app gebruikt.\n\n**1. Welke Informatie Verzamelen Wij?**\n\nDeze app is een statische webapplicatie die uitsluitend lokaal in uw browser (of via een WebView op Android) draait. Wij verzamelen geen persoonlijk identificeerbare informatie.\n\n- **Favoriete Voorstellingen**: Wanneer u een voorstelling als favoriet markeert, wordt deze informatie uitsluitend lokaal opgeslagen op uw apparaat in de lokale opslag van de browser (localStorage). Deze gegevens worden niet naar externe servers verzonden en zijn alleen toegankelijk voor u.\n- **Notificatietoestemming**: De app kan u om toestemming vragen om browsernotificaties te tonen voor herinneringen aan voorstellingen. Uw keuze wordt lokaal door uw browser beheerd en niet door ons verzameld of opgeslagen.\n- **Zoekopdrachten**: Zoektermen die u invoert, worden niet opgeslagen of verzonden. Ze worden alleen gebruikt om lokaal de timetable te filteren.\n\n**2. Hoe Gebruiken Wij Uw Informatie?**\n\nDe lokaal opgeslagen informatie wordt alleen gebruikt om u een gepersonaliseerde ervaring binnen de app te bieden.\n\n**3. Delen van Uw Informatie**\n\nWij delen uw informatie met niemand. Aangezien we geen persoonlijke informatie verzamelen, is er geen informatie om te delen.\n\n**4. Externe Links**\n\nDeze app bevat links naar externe websites (bijv. Google Calendar). Wanneer u op deze links klikt, verlaat u onze app. Wij zijn niet verantwoordelijk voor het privacybeleid van andere websites.\n\n**5. Beveiliging**\n\nAangezien alle relevante gegevens lokaal op uw apparaat worden opgeslagen, zijn de beveiligingsrisico's minimaal.\n\n**6. Wijzigingen in Dit Privacybeleid**\n\nWe kunnen dit privacybeleid van tijd tot tijd bijwerken. Wijzigingen zijn onmiddellijk van kracht nadat ze in de app zijn geplaatst.\n\n**7. Contact Met Ons Opnemen**\n\nAls u vragen heeft over dit privacybeleid, kunt u contact met ons opnemen via: Info@cafetheaterfestival.nl`
  },
  en: {
    common: {
      timetable: 'Timetable', blockTimetable: 'Block Schedule', favorites: 'Favorites',
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
      calmRoute: 'Calm Route', proudMainSponsor: 'Is proud main sponsor of %s',
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
      back: 'Back'
    },
    cookiePopup: {
      title: 'We use cookies',
      text: 'This website uses cookies to enhance your experience, analyze performance, and personalize marketing. By clicking "Accept All", you agree to the use of all cookies. You can adjust your preferences by clicking "Functional Only" or decline all non-essential cookies with "Decline".',
      acceptAll: 'Accept All',
      acceptFunctional: 'Functional Only',
      decline: 'Decline'
    },
    genres: {
        'Muziektheater': 'Musical Theatre', 'Musical': 'Musical', 'Opera': 'Opera', 'Dans': 'Dance',
        'Club-stijl dans': 'Club-style Dance', 'Hip-hop dans': 'Hip-hop Dance', 'Theater': 'Theatre',
        'Teksttoneel': 'Text-based Theatre', 'Fysiek theater': 'Physical Theatre',
        'Beeldend theater': 'Visual Theatre', 'Mime': 'Mime', 'Performance': 'Performance',
        'Kindertheater': 'Family Theatre', 'Kinderdans': 'Family Dance', 'Interactief': 'Interactive',
        'Clownerie': 'Clowning', 'Circus': 'Circus', 'Poëzie en muziek': 'Poetry and Music',
        'Drag': 'Drag', 'Burlesque': 'Burlesque', 'Variéte': 'Variéte', 'Storytelling': 'Storytelling',
        'Inclusief theater': 'Inclusive theatre', 'Documentair theater': 'Documentairy theatre',
        'Community theater': 'Community theatre'
    },
    payWhatYouCan: {
      title: "Pay What You Can",
      text: `At CTF you never have to buy a ticket or reserve a spot! We think that is important because we play in cafes, and we also want to invite people who don't come for the performance to stay and experience the performance. Nevertheless, we ask the audience to also financially contribute to the festival and the creators. We do this with our **Pay What You Can** system.\n\nAfter the performance, the makers will ask for a financial contribution of **€6, €8, or €10 euro.** We use different amounts because we want to be there for visitors with both small and large wallets. At CTF you can always pay with PIN, or via a QR code with Tikkie.`
    },
    crowdMeterInfo: {
      title: "Explanation Crowd Meter",
      text: `This is our crowd meter! Here you can see in advance how busy we expect a performance to be. We update this crowd meter live, so you can see in your app if a performance is full.\n\n**Explanation of colors:**\n\n**Green**= The expected crowd for this performance is normal. If you arrive on time, you will probably find a seat\n\n**Orange**= The expected crowd for this performance is busy. We expect some of the audience to stand to see it well\n\n**Red**= The expected crowd for this performance is very busy. Arrive on time, as this performance might fill up\n\n**Red bar with cross**= This performance is full! You can still go to one of the other performances`
    },
    calmRouteInfo: {
        title: 'Calm Route',
        text: `Not everyone enjoys a crowded and busy café, which is why we created the Calm Route. For each festival, there are two performances for which it is possible to reserve a spot, ensuring you have a seat. Additionally, the selected performances will also be quieter than some other performances at the festival.\n\nPlease note: the performances in the calm route are not low-stimulus. Due to the unpredictable nature of the café space and the fact that many performances use the entire space, we cannot guarantee a low-stimulus environment for any performance.`,
        button: 'Reserve a spot'
    },
    privacyPolicyContent: `**Privacy Policy for the Café Theater Festival Webapp**\n\n*Last updated: June 30, 2025*\n\nWelcome to the Café Theater Festival Webapp. This app is designed to help you view the festival timetable, mark performances as favorites, set reminders, and add events to your calendar.\n\nYour privacy is important to us. This privacy policy describes how we collect, use, and protect information when you use our app.\n\n**1. What Information Do We Collect?**\n\nThis app is a static web application that runs exclusively locally in your browser (or via a WebView on Android). We do not collect any personally identifiable information.\n\n- **Favorite Performances**: When you mark a performance as a favorite, this information is stored exclusively locally on your device in the browser's local storage (localStorage). This data is not sent to external servers and is only accessible to you.\n- **Notification Permission**: The app may ask for your permission to display browser notifications for performance reminders. Your choice is managed locally by your browser and not collected or stored by us.\n- **Search Queries**: Search terms you enter are not stored or sent. They are only used to filter the timetable locally.\n\n**2. How Do We Use Your Information?**\n\nThe locally stored information is only used to provide you with a personalized experience within the app.\n\n**3. Sharing Your Information**\n\nWe do not share your information with anyone. Aangezien we geen persoonlijke informatie verzamelen, is er geen informatie om te delen.\n\n**4. External Links**\n\nThis app contains links to external websites (e.g., Google Calendar). When you click these links, you leave our app. We are not responsible for the privacy practices of other websites.\n\n**5. Beveiliging**\n\nAangezien alle relevante gegevens lokaal op uw apparaat worden opgeslagen, zijn de beveiligingsrisico's minimaal.\n\n**6. Wijzigingen in Dit Privacybeleid**\n\nWe may update this privacy policy from time to time. Changes are immediate after being posted in the app.\n\n**7. Contact Us**\n\nIf you have questions about this privacy policy, you can contact us at: Info@cafetheaterfestival.nl`
  },
};

const getSafetyIcons = (translations, language) => [
    { key: 'wheelchairAccessible', url: 'https://cafetheaterfestival.nl/wp-content/uploads/2025/06/CTF-ICONS_Rolstoeltoegankelijk.png', tooltip: translations[language].common.tooltipWheelchair, label: translations[language].common.wheelchairAccessible },
    { key: 'diningFacility', url: 'https://cafetheaterfestival.nl/wp-content/uploads/2025/06/CTF-ICONS_Eetmogelijkheid.png', tooltip: translations[language].common.tooltipDining, label: translations[language].common.diningFacility },
    { key: 'suitableForChildren', url: 'https://cafetheaterfestival.nl/wp-content/uploads/2025/06/CTF-ICONS_Geschikt-Voor-Kinderen.png', tooltip: translations[language].common.tooltipChildren, label: translations[language].common.suitableForChildren },
    { key: 'dutchLanguage', url: 'https://cafetheaterfestival.nl/wp-content/uploads/2025/06/CTF-ICONS_NL.png', tooltip: translations[language].common.tooltipDutch, label: translations[language].common.dutchLanguage },
    { key: 'englishLanguage', url: 'https://cafetheaterfestival.nl/wp-content/uploads/2025/06/CTF-ICONS_ENG.png', tooltip: translations[language].common.tooltipEnglish, label: translations[language].common.englishLanguage },
    { key: 'dialogueFree', url: 'https://cafetheaterfestival.nl/wp-content/uploads/2025/06/CTF-ICONS_DIALOGUE-FREE.png', tooltip: translations[language].common.tooltipDialogueFree, label: translations[language].common.dialogueFree },
    { key: 'hasNGT', url: 'https://cafetheaterfestival.nl/wp-content/uploads/2025/06/vgtliggend-1-removebg-preview.png', tooltip: translations[language].common.tooltipNGT, label: 'Tolk NGT' },
];


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
        <li key={`li-${index}`} dangerouslySetInnerHTML={{ __html: listItemContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      );
    } else if (trimmedLine === '') { 
      addCurrentList();
    } else { 
      addCurrentList();
      elements.push(
        <p key={`p-${index}`} dangerouslySetInnerHTML={{ __html: trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} className={`mb-4 last:mb-0 ${textColorClass}`} />
      );
    }
  });

  addCurrentList();

  return elements;
};

const renderGenericPopupText = (content) => {
  const lines = content.trim().split('\n\n');
  const elements = lines.map((line, index) => (
      <p key={`p-${index}`} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} className="mb-4 last:mb-0 text-white" />
  ));
  return elements;
};

// ========= WIJZIGING: Component voor opgemaakte tekst bijgewerkt =========
const CustomTextRenderer = ({ text, imageUrl, title = 'Afbeelding', textColorClass = 'text-white' }) => {
    if (!text) return null;

    // Functie om hyperlinks, e-mailadressen en buttons te parsen
    const parseLine = (line) => {
        // Parse e-mailadressen
        line = line.replace(
            /(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/g,
            '<a href="mailto:$1" class="underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        // Parse hyperlinks zoals: woord [url]
        line = line.replace(
            /(\S+)\s*\[(https?:\/\/[^\s\]]+)\]/g,
            '<a href="$2" class="underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Parse hyperlinks waarbij de tekst de URL zelf is: [url]
        line = line.replace(
            /\[(https?:\/\/[^\s\]]+)\]/g,
            '<a href="$1" class="underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        // NIEUW: Parse buttons [button:titel:url]
        line = line.replace(
            /\[button:(.*?):(https?:\/\/[^\s\]]+)\]/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-block bg-[#2e9aaa] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#20747f] transition-colors no-underline">$1</a>'
        );

        return line;
    };

    // Splits de tekst in regels en maak voor elke regel het juiste HTML-element
    const elements = text.split('\n').map((line, index) => {
        let content = line.trim();
        
        if (content.endsWith('[h1]')) {
            const parsedContent = parseLine(content.slice(0, -4).trim());
            return <h1 key={index} className={`text-3xl font-bold mb-4 ${textColorClass}`} dangerouslySetInnerHTML={{ __html: parsedContent }} />;
        }
        if (content.endsWith('[h2]')) {
            const parsedContent = parseLine(content.slice(0, -4).trim());
            return <h2 key={index} className={`text-2xl font-bold mb-3 ${textColorClass}`} dangerouslySetInnerHTML={{ __html: parsedContent }} />;
        }
        if (content.endsWith('[h3]')) {
            const parsedContent = parseLine(content.slice(0, -4).trim());
            return <h3 key={index} className={`text-xl font-bold mb-2 ${textColorClass}`} dangerouslySetInnerHTML={{ __html: parsedContent }} />;
        }
        
        if (content === '') {
            return <br key={index} />;
        }

        const parsedContent = parseLine(content);
        return <p key={index} className={`mb-4 ${textColorClass}`} dangerouslySetInnerHTML={{ __html: parsedContent }} />;
    });

    return (
        <div className="prose prose-invert max-w-none">
            {/* WIJZIGING: Afbeelding bovenaan tonen met aangepaste hoogte */}
            {imageUrl && (
                <img 
                    src={imageUrl} 
                    alt={`[Afbeelding van ${title}]`}
                    className="rounded-lg shadow-lg w-full h-72 object-cover mb-6"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            )}
            {elements}
        </div>
    );
};


const AccessibilityNudge = ({ language, translations, accessibilitySettings, setAccessibilitySettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const nudgeRef = useRef(null);

    const toggleSetting = (setting) => {
        setAccessibilitySettings(prev => ({ ...prev, [setting]: !prev[setting] }));
    };

    const resetSettings = () => {
        setAccessibilitySettings({
            grayscale: false,
            highContrast: false,
            negativeContrast: false,
            underlineLinks: false,
            readableFont: false,
        });
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && nudgeRef.current && !nudgeRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const options = [
        { key: 'grayscale', label: translations[language].common.grayscale },
        { key: 'highContrast', label: translations[language].common.highContrast },
        { key: 'negativeContrast', label: translations[language].common.negativeContrast },
        { key: 'underlineLinks', label: translations[language].common.underlineLinks },
        { key: 'readableFont', label: translations[language].common.readableFont },
    ];
    
    const UniversalAccessIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-5v12c0 .55-.45 1-1 1s-1-.45-1-1v-5h-2v5c0 .55-.45 1-1 1s-1-.45-1-1V9H3c-.55 0-1-.45-1-1s.45-1 1-1h18c.55 0 1 .45 1 1s-.45 1-1 1z"/>
        </svg>
    );

    return (
        <div
            ref={nudgeRef}
            className={`fixed top-1/2 right-0 transform -translate-y-1/2 z-50 flex items-center ${!isOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
            <div className={`bg-[#1a5b64] rounded-l-lg shadow-xl p-4 text-white w-64 mr-[-1px] transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0'}`}>
                <h3 className="font-bold text-lg mb-2">{translations[language].common.accessibility}</h3>
                <div className="space-y-2">
                    {options.map(option => (
                        <label key={option.key} className="flex items-center justify-between cursor-pointer p-2 hover:bg-white/10 rounded-md">
                            <span>{option.label}</span>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={accessibilitySettings[option.key]}
                                    onChange={() => toggleSetting(option.key)}
                                />
                                <div className={`block w-10 h-6 rounded-full ${accessibilitySettings[option.key] ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${accessibilitySettings[option.key] ? 'translate-x-full' : ''}`}></div>
                            </div>
                        </label>
                    ))}
                </div>
                <div className="border-t border-white/20 my-3"></div>
                <button
                    onClick={resetSettings}
                    className="w-full text-center py-2 px-4 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                >
                    {translations[language].common.resetAccessibility}
                </button>
            </div>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-20 bg-[#2e9aaa] rounded-l-full shadow-lg flex items-center justify-center hover:bg-[#20747f] transition-colors focus:outline-none pl-2 pointer-events-auto"
                aria-label={translations[language].common.accessibility}
                aria-expanded={isOpen}
                title={translations[language].common.accessibility}
            >
                <UniversalAccessIcon />
            </button>
        </div>
    );
};


const TopRightControls = ({ language, handleLanguageChange, onReadPage, translations }) => (
    <div className="absolute top-12 right-4 z-10 flex flex-row items-center space-x-2">
        <button onClick={onReadPage} className="px-2 py-1 h-8 sm:h-10 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm font-semibold flex items-center justify-center" aria-label={translations[language].common.readPage}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5zM22 12c0-3.31-2.69-6-6-6v2c2.21 0 4 1.79 4 4s-1.79 4-4 4v2c3.31 0 6-2.69 6-6z"/></svg>
        </button>
        <button onClick={handleLanguageChange} className="px-3 py-1 h-8 sm:h-10 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm font-semibold">
            {language === 'nl' ? 'EN' : 'NL'}
        </button>
    </div>
);


const AppHeader = ({ titleRef, translations, language }) => (
  <div className="flex flex-col items-center w-full pt-12">
    <img src="https://cafetheaterfestival.nl/wp-content/uploads/2025/06/Logo_Web_Trans_Wit.png" alt="[Afbeelding van Café Theater Festival Logo]" className="w-full max-w-[10rem] h-auto mb-4"/>
  </div>
);

// ========= WIJZIGING: StickyHeader bijgewerkt voor Open Call en toegankelijkheid =========
const StickyHeader = ({ isVisible, uniqueEvents, handleEventClick, handleFavoritesClick, handleFriendsFavoritesClick, handleMoreInfoClick, hasFriendsFavorites, selectedEvent, currentView, language, handleLanguageChange, translations, onLogoClick, onReadPage, openContentPopup, isInitialLoad, openCallItems = [], onOpenCallSelect }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    let currentSelectionText = translations[language].common.chooseCity;
    if (currentView === 'favorites') currentSelectionText = translations[language].common.favorites;
    else if (currentView === 'friends-favorites') currentSelectionText = translations[language].common.friendsFavorites;
    else if (currentView === 'more-info') currentSelectionText = translations[language].common.moreInfo;
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
                           <>
                               <img onClick={onLogoClick} className="h-16 w-auto cursor-pointer" src="https://cafetheaterfestival.nl/wp-content/uploads/2025/06/fav-wit-1.png" alt="[Afbeelding van CTF Logo Favicon]"/>
                               <button 
                                    onClick={() => openContentPopup('iframe', 'https://ldegroen.github.io/Stamgastenformulier/')} 
                                    className="px-4 py-2 rounded-lg font-semibold bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm"
                                >
                                    <span className="hidden sm:inline">{translations[language].common.becomeRegularGuest}</span>
                                    <span className="sm:hidden">{translations[language].common.becomeRegularGuestShort}</span>
                                </button>
                           </>
                       ) : (
                           <button 
                                onClick={onLogoClick}
                                className="px-4 py-2 rounded-lg font-semibold bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                                {translations[language].common.back}
                           </button>
                       )}
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="inline-flex justify-center w-full rounded-md border border-gray-500 shadow-sm px-4 py-2 bg-white/30 text-sm font-medium text-white hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                                {currentSelectionText}
                                <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
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
                                        {/* TOEGEVOEGD: Voeg Open Call items toe aan de dropdown */}
                                        {openCallItems.length > 0 && openCallItems.map(item => {
                                            const title = item.title[language] || item.title.nl;
                                            return (
                                                <button key={title} onClick={() => { onOpenCallSelect(item); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{title}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="absolute right-4 bottom-2 flex items-center space-x-2">
                        <button onClick={onReadPage} className="px-2 py-1 h-8 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-xs font-semibold flex items-center justify-center" aria-label={translations[language].common.readPage}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5zM22 12c0-3.31-2.69-6-6-6v2c2.21 0 4 1.79 4 4s-1.79 4-4 4v2c3.31 0 6-2.69 6-6z"/></svg>
                        </button>
                        <button onClick={handleLanguageChange} className="px-3 py-1 h-8 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-xs font-semibold">{language === 'nl' ? 'EN' : 'NL'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ========= WIJZIGING: EventNavigation bijgewerkt voor Open Call =========
const EventNavigation = ({ onEventSelect, onFavoritesSelect, onFriendsFavoritesSelect, onMoreInfoSelect, hasFriendsFavorites, uniqueEvents, language, translations, openCallItems = [], onOpenCallSelect }) => {
    const eventButtons = uniqueEvents.map(event => (
        <button key={event} onClick={() => onEventSelect(event)} className="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50">{event}</button>
    ));

    // TOEGEVOEGD: Genereer knoppen voor "Open Call" items
    const openCallButtons = openCallItems.map(item => {
        const title = item.title[language] || item.title.nl;
        return (
            <button key={title} onClick={() => onOpenCallSelect(item)} className="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50">{title}</button>
        );
    });

    const utilityButtons = (
        <>
            <button onClick={onFavoritesSelect} className="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50">{translations[language].common.favorites}</button>
            {hasFriendsFavorites && <button onClick={onFriendsFavoritesSelect} className="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50">{translations[language].common.friendsFavorites}</button>}
            <button onClick={onMoreInfoSelect} className="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50">{translations[language].common.moreInfo}</button>
            {/* TOEGEVOEGD: Toon de Open Call knoppen */}
            {openCallButtons}
        </>
    );

    return (
        <div className="flex flex-col items-center gap-4 mb-8 p-3 max-w-full">
            <div className="flex flex-wrap justify-center gap-4">
                {eventButtons}
            </div>
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
    
    return (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-8 p-3 bg-white bg-opacity-20 rounded-xl shadow-lg max-w-full overflow-x-auto scrollbar-hide">
            <button onClick={() => { setSelectedDate('all-performances'); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === 'all-performances' ? 'bg-[#1a5b64] text-white shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>{translations[language].common.allPerformances}</button>
            {datesForCurrentSelectedEvent.map(date => (<button key={date} onClick={() => { setSelectedDate(date); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === date ? 'bg-[#1a5b64] text-white shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>{date}</button>))}
            {hasCalmRoutePerformances && (<button onClick={() => { setSelectedDate('calm-route'); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === 'calm-route' ? 'bg-[#1a5b64] text-white shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>{translations[language].common.calmRoute}</button>)}
        </div>
    );
};

const SponsorDisplay = React.forwardRef(({ sponsorInfo, language, translations }, ref) => {
    if (!sponsorInfo || !sponsorInfo.logoUrl) return <div ref={ref} className="h-12"></div>;

    return (
        <div ref={ref} className="flex flex-col items-center justify-center mt-12 mb-8 text-center">
            <img src={sponsorInfo.logoUrl} alt={`[Afbeelding van Logo ${sponsorInfo.eventName}]`} className="max-h-20 w-auto object-contain mb-2"/>
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
        <svg className={`h-5 w-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
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
        <svg className={`h-5 w-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
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


const EventViewSwitcher = ({ viewMode, setViewMode, language, translations, handleAnimatedUpdate }) => (
  <div className="flex justify-center gap-4 my-8">
    <button
      onClick={() => handleAnimatedUpdate(() => setViewMode('card'))}
      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${viewMode === 'card' ? 'bg-[#1a5b64] text-white shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}
    >
      {translations[language].common.cardView}
    </button>
    <button
      onClick={() => handleAnimatedUpdate(() => setViewMode('block'))}
      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${viewMode === 'block' ? 'bg-[#1a5b64] text-white shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}
    >
      {translations[language].common.blockTimetable}
    </button>
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
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );

    const FilterIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6-414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
    );

    return (
        <div
            ref={nudgeRef}
            className={`fixed top-1/2 left-0 transform -translate-y-1/2 z-50 flex items-center ${!isSearchOpen && !isFilterOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
            <div className="flex flex-col space-y-2 pointer-events-auto">
                 <button
                    onClick={toggleSearch}
                    className={`w-14 h-14 bg-[#2e9aaa] rounded-r-full shadow-lg flex items-center justify-center hover:bg-[#20747f] transition-colors focus:outline-none pl-3 ${isSearchOpen ? 'bg-[#20747f]' : ''}`}
                    aria-label="Zoeken"
                    aria-expanded={isSearchOpen}
                >
                    <SearchIcon />
                </button>
                 <button
                    onClick={toggleFilter}
                    className={`w-14 h-14 bg-[#2e9aaa] rounded-r-full shadow-lg flex items-center justify-center hover:bg-[#20747f] transition-colors focus:outline-none pl-3 ${isFilterOpen ? 'bg-[#20747f]' : ''}`}
                    aria-label="Filteren"
                    aria-expanded={isFilterOpen}
                >
                    <FilterIcon />
                </button>
            </div>

            <div className={`relative transition-all duration-300 ease-in-out w-80 h-[28rem] rounded-r-lg shadow-xl ml-[-1px] ${isSearchOpen || isFilterOpen ? 'translate-x-0 opacity-100 bg-[#1a5b64]' : '-translate-x-full opacity-0 bg-transparent'}`}>
                <div className={`absolute inset-0 p-4 text-white transition-opacity duration-300 pointer-events-none ${isSearchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
                    <h3 className="font-bold text-lg mb-4">{translations[language].common.searchPlaceholder.split('...')[0]}</h3>
                    <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} translations={translations} language={language} />
                </div>

                 <div className={`absolute inset-0 p-4 text-white transition-opacity duration-300 pointer-events-none ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
                    <h3 className="font-bold text-lg mb-4">{translations[language].common.filterByIcon.split('...')[0]}</h3>
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
        </div>
    );
};


const PerformanceCard = ({ item, favorites, toggleFavorite, addToGoogleCalendar, openContentPopup, language, handleIconMouseEnter, handleIconMouseLeave, translations, showMessageBox, safetyIcons, hideTime = false, isExportMode = false, isFriendsView = false, speak }) => {
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
        if (!item.genre || item.genre === 'N/A') return null;
        const genres = item.genre.split(',').map(g => g.trim());
        const translated = genres.map(g => translations[language]?.genres?.[g] || g);
        return translated.join(' / ');
    }, [item.genre, language, translations]);
    
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
        read: { title: translations[language].common.readPerformance, className: 'text-gray-500 hover:text-gray-700', fill: 'currentColor', stroke: 'currentColor', path: <path d="M11 5L6 9H2v6h4l5 4V5zM22 12c0-3.31-2.69-6-6-6v2c2.21 0 4 1.79 4 4s-1.79 4-4 4v2c3.31 0 6-2.69 6-6z"/> }
    };

    const handleReadPerformance = (e) => {
        e.stopPropagation();
        let textToSpeak = `${item.time}. ${fullTitle}. ${translations[language].common.location}: ${item.location}.`;
        if (translatedGenre) textToSpeak += ` ${translations[language].common.genre}: ${translatedGenre}.`;
        if (crowdInfo && crowdInfo.tooltip) textToSpeak += ` ${translations[language].common.crowdLevel}: ${crowdInfo.tooltip}.`;
        const activeSafetyIcons = safetyIcons.filter(icon => item.safetyInfo[icon.key]);
        if (activeSafetyIcons.length > 0) textToSpeak += ` Kenmerken: ${activeSafetyIcons.map(icon => icon.label).join(', ')}.`;
        if (item.isCalmRoute) textToSpeak += ` Deze voorstelling is onderdeel van de ${translations[language].common.calmRoute}.`;
        speak(textToSpeak, language);
    };

    const LocationElement = item.googleMapsUrl ? 'a' : 'div';

    return (
        <div className={`text-gray-800 rounded-xl shadow-xl border border-gray-200 transition-all duration-300 flex flex-col relative w-full md:w-[384px] bg-white overflow-hidden ${isCancelled || isFull ? 'opacity-50' : 'hover:scale-105 hover:shadow-2xl cursor-pointer'}`} onClick={() => !isCancelled && !isFull && !isExportMode && openContentPopup('performance', item)}>
            {translatedGenre && (
                <div className="bg-[#2e9aaa] text-white text-sm md:text-base font-bold uppercase tracking-wider text-center py-1 px-4">
                    {translatedGenre}
                </div>
            )}
            
            <div className="p-4 flex flex-col flex-grow">
                {!hideTime && <p className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{item.time}</p>}
                
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between w-full mb-2">
                    <h3 className="text-lg md:text-xl font-semibold text-[#20747f] mb-1 sm:mb-0 sm:mr-4 flex-grow">{fullTitle}</h3>
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
                                <svg xmlns="http://www.w3.org/24/24" className="h-7 w-7 inline-block" viewBox="0 0 24 24" fill="currentColor">
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
                            alt={`[Afbeelding van ${item.artist}]`} 
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
                            if (type === 'read' && !speak) return null;
                            const clickHandlers = { 
                                favorite: (e) => toggleFavorite(item, e), 
                                calendar: (e) => addToGoogleCalendar(e, fullTitle, item.date, item.time, item.location), 
                                share: (e) => handleShare(e, fullTitle, item.url),
                                read: handleReadPerformance
                            };
                            return (
                                <div key={type} className="cursor-pointer" onClick={clickHandlers[type]} title={icon.title}>
                                   <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors duration-200 ${icon.className}`} viewBox="0 0 24 24" fill={icon.fill} stroke={icon.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{icon.path}</svg>
                                </div>
                            );
                        })}
                        {isFriendsView && (
                             <div className="cursor-pointer" onClick={(e) => toggleFavorite(item, e)} title={actionIcons.favorite.title}>
                                 <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors duration-200 ${actionIcons.favorite.className}`} viewBox="0 0 24 24" fill={actionIcons.favorite.fill} stroke={actionIcons.favorite.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{actionIcons.favorite.path}</svg>
                             </div>
                        )}
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row justify-between items-center mt-auto pt-4 border-t border-gray-200 w-full gap-4">
                    <div className="flex flex-row flex-wrap justify-start items-center gap-2">
                        {safetyIcons.map(icon => item.safetyInfo[icon.key] && (<span key={icon.key} className="text-gray-600 flex items-center" onMouseEnter={(e) => handleIconMouseEnter(e, icon.tooltip)} onMouseLeave={handleIconMouseLeave}><img src={icon.url} alt={icon.tooltip} className="h-6 w-auto inline-block"/></span>))}
                    </div>
                    {!isExportMode && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            {item.isCalmRoute && (<button onClick={(e) => { e.stopPropagation(); openContentPopup('calmRouteInfo', translations[language].calmRouteInfo);}} className="px-4 py-2 bg-[#20747f] text-white rounded-lg shadow-md hover:bg-[#1a5b64] transition-all duration-200 text-sm md:text-base font-semibold text-center">{translations[language].common.calmRoute}</button>)}
                            {item.pwycLink && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); if (item.pwycLink) window.open(item.pwycLink, '_blank', 'noopener,noreferrer'); }} 
                                    className="px-4 py-2 bg-[#20747f] text-white rounded-lg shadow-md hover:bg-[#1a5b64] transition-all duration-200 text-sm md:text-base font-semibold text-center" 
                                    title={translations[language].payWhatYouCan.title}
                                >
                                    {translations[language].payWhatYouCan.title}
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); openContentPopup('performance', item); }} className="px-4 py-2 bg-[#20747f] text-white rounded-lg shadow-md hover:bg-[#1a5b64] transition-all duration-200 text-sm md:text-base">{translations[language].common.moreInfo}</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const TimetableDisplay = React.forwardRef(({
  loading, error, displayedData, currentView, favorites, toggleFavorite,
  addToGoogleCalendar, openContentPopup, language, handleIconMouseEnter, handleIconMouseLeave, translations,
  selectedEvent, searchTerm, showMessageBox, selectedDate, safetyIcons, isExportMode = false, speak,
  iconFilters, genreFilters
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
                <h3 className="text-xl font-semibold text-white mb-4 text-center drop_shadow">
                  {subGroup.subGroupTitle}
                </h3>
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
                    speak={speak}
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
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isFavorite ? 'text-red-500' : 'text-white/70'}`} viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDay === day ? 'bg-[#1a5b64] text-white shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}
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

const PerformanceDetailPopup = ({ item, language }) => {
    const title = item.artist ? `${item.artist} - ${item.title}` : item.title;
    const credits = item.marketingCredits;
    const textAboutPerformance = language === 'nl' ? item.marketingVoorstellingNL : item.marketingVoorstellingENG;
    const textAboutMakers = language === 'nl' ? item.marketingBioNL : item.marketingBioENG;
    const image1 = item.marketingAfbeelding1;
    const image2 = item.marketingAfbeelding2;
    const keywords = item.marketingKeywords;

    const renderTextWithLineBreaks = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, index) => (
            <p key={index} className="mb-2">{line}</p>
        ));
    };

    return (
        <div className="overflow-y-auto flex-grow p-4 sm:p-6 md:p-8 text-white">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-center">{title}</h2>
            {credits && <p className="text-center text-gray-300 mb-6 italic md:text-lg">{credits}</p>}

            <div className="space-y-8 max-w-4xl mx-auto">
                {(textAboutPerformance || image1) && (
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="md:w-1/2 text-left">
                            <h3 className="text-xl md:text-2xl font-semibold mb-3 border-b-2 border-white/50 pb-2">Over de voorstelling</h3>
                            <div className="prose prose-invert max-w-none md:prose-lg">
                                {renderTextWithLineBreaks(textAboutPerformance)}
                            </div>
                        </div>
                        {image1 && (
                            <div className="md:w-1/2">
                                <img src={image1} alt={`[Afbeelding van ${title}]`} className="rounded-lg shadow-lg w-full h-auto object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                        )}
                    </div>
                )}

                {(textAboutMakers || image2) && (
                    <div className="flex flex-col md:flex-row-reverse items-center gap-6">
                        <div className="md:w-1/2 text-left md:text-right">
                             <h3 className="text-xl md:text-2xl font-semibold mb-3 border-b-2 border-white/50 pb-2">Over de makers</h3>
                            <div className="prose prose-invert max-w-none md:prose-lg">
                                {renderTextWithLineBreaks(textAboutMakers)}
                            </div>
                        </div>
                        {image2 && (
                            <div className="md:w-1/2">
                                <img src={image2} alt={`[Afbeelding van ${item.artist}]`} className="rounded-lg shadow-lg w-full h-auto object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {keywords && (
                <div className="mt-8 pt-4 border-t border-white/30 max-w-4xl mx-auto">
                    <p className="text-center text-gray-300 md:text-lg">
                        <span className="font-semibold">Keywords:</span> {keywords}
                    </p>
                </div>
            )}
        </div>
    );
};


// ========= WIJZIGING: PopupModal bijgewerkt =========
const PopupModal = ({ showPopup, closePopup, popupContent, language, translations, speak }) => {
  if (!showPopup) return null;

  const handleReadPopup = () => {
      let textToSpeak = '';
      if (popupContent && popupContent.data) {
          switch(popupContent.type) {
              case 'performance':
                  const item = popupContent.data;
                  const title = item.artist ? `${item.artist} - ${item.title}` : item.title;
                  const credits = item.marketingCredits ? `Credits: ${item.marketingCredits}.` : '';
                  const aboutPerf = (language === 'nl' ? item.marketingVoorstellingNL : item.marketingVoorstellingENG) || '';
                  const aboutMakers = (language === 'nl' ? item.marketingBioNL : item.marketingBioENG) || '';
                  textToSpeak = `${title}. ${credits} Over de voorstelling: ${aboutPerf}. Over de makers: ${aboutMakers}.`;
                  break;
              case 'text':
                  textToSpeak = `${popupContent.data.title}. ${popupContent.data.text.replace(/\*\*/g, '')}`;
                  break;
              case 'customText':
                  // Verwijder de opmaakcodes voor het voorlezen
                  textToSpeak = popupContent.data.text
                      .replace(/\[h[1-3]\]/g, '. ')
                      .replace(/(\S+)\s*\[(https?:\/\/[^\s\]]+)\]/g, '$1')
                      .replace(/\[(https?:\/\/[^\s\]]+)\]/g, '$1')
                      .replace(/\[button:(.*?):https?:\/\/[^\s\]]+\]/g, 'Knop: $1.'); // Button voorlezen
                  break;
              case 'calmRouteInfo':
                  textToSpeak = `${popupContent.data.title}. ${popupContent.data.text.replace(/\*\*/g, '')}`;
                  break;
              case 'image':
                  textToSpeak = `Kaart. ${popupContent.data.alt || ''}`;
                  break;
              case 'iframe':
                  textToSpeak = translations[language].common.noContentAvailable;
                  break;
              default:
                  textToSpeak = translations[language].common.noContentAvailable;
          }
      } else {
          textToSpeak = translations[language].common.noContentAvailable;
      }
      speak(textToSpeak, language);
  };

  const renderContent = () => {
    if (!popupContent || !popupContent.type) {
      return <p className="text-white">{translations[language].common.noContentAvailable}</p>;
    }

    switch (popupContent.type) {
      case 'performance':
        return <PerformanceDetailPopup item={popupContent.data} language={language} />;
      case 'iframe':
        return (
          <iframe
            src={popupContent.data}
            title="Meer info"
            className="w-full h-full border-0 rounded-lg flex-grow"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          ></iframe>
        );
      case 'text':
        return (
          <div className="overflow-y-auto flex-grow p-4">
            <h2 className="text-2xl font-bold mb-4 text-white">{popupContent.data.title}</h2>
            {renderGenericPopupText(popupContent.data.text)}
          </div>
        );
      case 'customText':
        return (
          <div className="overflow-y-auto flex-grow p-6">
            <CustomTextRenderer 
              text={popupContent.data.text} 
              imageUrl={popupContent.data.imageUrl}
              title={popupContent.data.title}
            />
          </div>
        );
      case 'calmRouteInfo':
        return (
          <div className="overflow-y-auto flex-grow p-4">
            <h2 className="text-2xl font-bold mb-4 text-white">{popupContent.data.title}</h2>
            {renderGenericPopupText(popupContent.data.text)}
            {popupContent.data.button && (
              <button
                onClick={() => window.open('https://ldegroen.github.io/Stamgastenformulier/', '_blank')}
                className="mt-4 px-6 py-3 bg-white text-[#20747f] rounded-lg shadow-md hover:bg-gray-100 transition-all duration-200 text-base font-semibold"
              >
                {popupContent.data.button}
              </button>
            )}
          </div>
        );
      case 'image':
        return (
          <ZoomableImage src={popupContent.data} alt={translations[language].common.mapTitle.replace('%s', '')} />
        );
      default:
        return <p className="text-white">{translations[language].common.noContentAvailable}</p>;
    }
  };

  const showReadAloudButton = ['text', 'calmRouteInfo', 'image', 'performance', 'customText'].includes(popupContent.type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[90]">
      <div className="bg-[#20747f] text-white p-4 rounded-xl shadow-2xl relative w-[95vw] h-[90vh] flex flex-col">
        <button onClick={closePopup} className="absolute top-2 right-2 text-white hover:text-gray-200 text-3xl font-bold z-10" aria-label={translations[language].common.close}>&times;</button>
        {showReadAloudButton && (
            <button onClick={handleReadPopup} className="absolute top-2 right-12 text-white hover:text-gray-200 text-2xl font-bold z-10" aria-label={translations[language].common.readPopup}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5zM22 12c0-3.31-2.69-6-6-6v2c2.21 0 4 1.79 4 4s-1.79 4-4 4v2c3.31 0 6-2.69 6-6z"/></svg>
            </button>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

const PrivacyPolicyModal = ({ showPrivacyPolicy, setShowPrivacyPolicy, language, renderPrivacyPolicyContent, translations, speak }) => {
  if (!showPrivacyPolicy) return null;

  const handleReadPrivacyPolicy = () => {
      const plainText = translations[language].privacyPolicyContent.replace(/\*\*/g, '');
      speak(plainText, language);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[90]">
      <div className="bg-white text-gray-800 p-8 rounded-xl shadow-2xl relative w-[95vw] h-[90vh] max-w-4xl flex flex-col">
        <button onClick={() => setShowPrivacyPolicy(false)} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-3xl font-bold z-10" aria-label={translations[language].common.close}>&times;</button>
        <button onClick={handleReadPrivacyPolicy} className="absolute top-4 right-16 text-gray-600 hover:text-gray-900 text-2xl font-bold z-10" aria-label={translations[language].common.readPage}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M11 5L6 9H2v6h4l5 4V5zM22 12c0-3.31-2.69-6-6-6v2c2.21 0 4 1.79 4 4s-1.79 4-4 4v2c3.31 0 6-2.69 6-6z"/></svg>
        </button>
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
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
        {title && <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>}
        <div className="text-lg font-medium text-gray-800 mb-6">{message}</div>
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
    
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full text-gray-800">
                <h3 className="text-xl font-bold text-center mb-6">{translations.common.exportFavoritesTitle}</h3>
                
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
                        className="w-full bg-[#20747f] hover:bg-[#1a5b64] text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-400 flex items-center justify-center gap-2"
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
    if (!show || !performances || performances.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full text-gray-800 flex flex-col max-h-[80vh]">
                <h3 className="text-xl font-bold text-center mb-4">{translations.common.favoritesFromFriend}</h3>
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
                    <button onClick={onImport} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
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

// ========= WIJZIGING: MoreInfoPage bijgewerkt =========
const MoreInfoPage = ({ generalInfoItems, accessibilityInfoItems, openContentPopup, language, translations }) => {
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
                  onClick={() => {
                      const itemText = item.tekst?.[language] || item.tekst?.nl;
                      if (item.weergave && itemText) {
                          openContentPopup('customText', { 
                              text: itemText,
                              imageUrl: item.imageUrl, // Afbeelding URL doorgeven
                              title: itemTitle // Titel doorgeven voor alt-tekst
                          });
                      } else {
                          const itemUrl = item.url?.[language] || item.url?.nl;
                          openContentPopup('iframe', itemUrl);
                      }
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={`[Afbeelding van ${itemTitle}]`}
                    className="w-full h-48 object-cover"
                    onError={(e) => { e.target.src = 'https://placehold.co/600x400/20747f/FFFFFF?text=Afbeelding+niet+gevonden'; }}
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800">{itemTitle}</h3>
                  </div>
                </div>
            )
          })}
        </div>
      </div>
    );
  };

  const hasContent = (generalInfoItems && generalInfoItems.length > 0) || (accessibilityInfoItems && accessibilityInfoItems.length > 0);

  if (!hasContent) {
    return (
      <div className="text-center text-white p-4 bg-white bg-opacity-20 rounded-xl shadow-lg">
        Geen extra informatie beschikbaar.
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pt-20">
      {renderInfoSection(translations[language].common.general, generalInfoItems, false)}
      {renderInfoSection(translations[language].common.accessibility, accessibilityInfoItems, true)}
    </div>
  );
};


// ========= WIJZIGING: NewsPage bijgewerkt =========
const NewsPage = ({ newsItems, openContentPopup, language, translations }) => {
  if (!newsItems || newsItems.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-16 px-4">
      <h2 className="text-3xl font-bold text-white mb-8 text-center drop_shadow-lg">{translations[language].common.news}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
        {newsItems.map((item, index) => {
          const itemTitle = item.title[language] || item.title.nl;

          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full md:w-[340px]"
              onClick={() => {
                  const itemText = item.tekst?.[language] || item.tekst?.nl;
                  if (item.weergave && itemText) {
                      openContentPopup('customText', { 
                          text: itemText,
                          imageUrl: item.imageUrl, // Afbeelding URL doorgeven
                          title: itemTitle // Titel doorgeven voor alt-tekst
                      });
                  } else {
                      const itemUrl = item.url?.[language] || item.url?.nl;
                      openContentPopup('iframe', itemUrl);
                  }
              }}
            >
              <img
                src={item.imageUrl}
                alt={`[Afbeelding van ${itemTitle}]`}
                className="w-full h-48 object-cover"
                onError={(e) => { e.target.src = 'https://placehold.co/600x400/20747f/FFFFFF?text=Afbeelding+niet+gevonden'; }}
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800">{itemTitle}</h3>
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


const AppFooter = ({ logos, language, translations }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef(null);
    const intervalRef = useRef(null);
    const timeoutRef = useRef(null);

    const extendedLogos = useMemo(() => {
        if (!logos || logos.length < 6) return logos || [];
        return [...logos, ...logos];
    }, [logos]);

    useEffect(() => {
        clearInterval(intervalRef.current);
        clearTimeout(timeoutRef.current);

        if (!logos || logos.length < 6) return;

        intervalRef.current = setInterval(() => {
            setCurrentIndex(prev => prev + 6);
        }, 20000);

        return () => {
            clearInterval(intervalRef.current);
            clearTimeout(timeoutRef.current);
        };
    }, [logos, intervalRef, timeoutRef]); // OPGELOST: refs toegevoegd aan dependency array

    useEffect(() => {
        if (!containerRef.current || !extendedLogos.length || logos.length < 6) return;
        
        const container = containerRef.current;
        const logoItem = container.children[0];
        if (!logoItem) return;

        const styles = window.getComputedStyle(logoItem);
        const marginLeft = parseFloat(styles.marginLeft);
        const marginRight = parseFloat(styles.marginRight);
        const itemWidth = logoItem.offsetWidth + marginLeft + marginRight;
        
        const scrollAmount = currentIndex * itemWidth;
        
        container.style.transition = 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
        container.style.transform = `translateX(-${scrollAmount}px)`;

        if (currentIndex >= logos.length) {
            timeoutRef.current = setTimeout(() => {
                const newIndex = currentIndex % logos.length;
                container.style.transition = 'none';
                const newScrollAmount = newIndex * itemWidth;
                container.style.transform = `translateX(-${newScrollAmount}px)`;
                
                requestAnimationFrame(() => {
                    setCurrentIndex(newIndex);
                });

            }, 1500);
        }

    }, [currentIndex, logos, extendedLogos.length, containerRef]); // OPGELOST: ref toegevoegd aan dependency array


    if (!logos || logos.length === 0) {
        return null;
    }

    return (
        <footer className="w-full bg-black bg-opacity-30 text-white text-center py-6 mt-12 overflow-hidden">
            <h3 className="text-lg font-semibold mb-4 px-4">{translations[language].common.footerText}</h3>
            <div className="relative h-24 flex items-center">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#20747f] via-transparent to-[#20747f] z-10 pointer-events-none"></div>
                <div className="flex" ref={containerRef}>
                    {extendedLogos.map((logo, index) => (
                        <div key={index} className="group relative flex-shrink-0 h-20 w-48 flex items-center justify-center mx-8">
                            <img 
                                src={logo.url} 
                                alt={`[Afbeelding van Begunstiger logo ${logo.name}]`}
                                className="max-h-16 w-auto object-contain transition-transform duration-300 ease-in-out group-hover:scale-125 group-hover:-translate-y-3" 
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="absolute bottom-full mb-2 w-max px-3 py-1 bg-gray-800 bg-opacity-80 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out pointer-events-none z-20">
                                {logo.name}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </footer>
    );
};

const CookieConsentPopup = ({ onAcceptAll, onAcceptFunctional, onDecline, language, translations }) => {
  const t = translations[language].cookiePopup;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 backdrop-blur-sm p-4 z-[100] text-white shadow-lg animate-fade-in">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h3 className="font-bold text-lg mb-1">{t.title}</h3>
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
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    grayscale: false, highContrast: false, negativeContrast: false,
    underlineLinks: false, readableFont: false,
  });
  const [generalInfoData, setGeneralInfoData] = useState([]);
  const [accessibilityInfoData, setAccessibilityInfoData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [benefactorLogos, setBenefactorLogos] = useState([]);
  const [cookieConsent, setCookieConsent] = useState(null);
  const [openCallItems, setOpenCallItems] = useState([]);
  
  const newsSectionRef = useRef(null);
  const titleRef = useRef(null);
  const sponsorRef = useRef(null);
  const notificationTimeouts = useRef({});
  const prevTimetableDataRef = useRef([]);
  const exportCardViewRef = useRef(null);
  const exportBlockViewRef = useRef(null);

  const safetyIcons = useMemo(() => getSafetyIcons(translations, language), [language]);
  
  // ========= WIJZIGING: 'translations' verwijderd uit dependency array =========
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
  }, [timetableData, selectedEvent, language]);

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
        } else if (selectedDate === 'all-performances') {
            const uniqueTitles = new Map();
            sourceData.filter(item => item.event === selectedEvent).forEach(item => {
                const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;
                if (!uniqueTitles.has(fullTitle)) uniqueTitles.set(fullTitle, item);
            });
            sourceData = [...uniqueTitles.values()];
        } else if (selectedDate) {
            sourceData = sourceData.filter(item => item.event === selectedEvent && item.date === selectedDate);
        }
    }
    
    if (sourceData.length === 0) return [];

    if (currentView === 'favorites' || currentView === 'friends-favorites' || searchTerm || (filterScope === 'all' && (iconFilters.size > 0 || genreFilters.size > 0))) {
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
  }, [searchTerm, currentView, selectedEvent, selectedDate, timetableData, favorites, friendsFavorites, language, eventInfoMap, iconFilters, genreFilters, filterScope]);

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


  const speak = useCallback((text, lang) => {
    if (window.AndroidBridge && window.AndroidBridge.speakText) {
      window.AndroidBridge.speakText(text, lang);
    } else if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(voice => voice.lang === lang || voice.lang.startsWith(lang + '-'));
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Text-to-Speech wordt niet ondersteund in deze omgeving.");
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (window.AndroidBridge && window.AndroidBridge.stopText) {
      window.AndroidBridge.stopText();
    } else if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handleReadPage = useCallback(() => {
    let textToSpeak = '';
    
    if (isInitialLoad) {
        textToSpeak += `${translations[language].common.timetable}. `;
        textToSpeak += `${translations[language].common.chooseCity}. `;
        textToSpeak += uniqueEvents.join(', ') + '. ';
        textToSpeak += `${translations[language].common.favorites}. `;
        if (friendsFavorites.size > 0) {
            textToSpeak += `${translations[language].common.friendsFavorites}. `;
        }
    } else if (currentView === 'more-info') {
        textToSpeak += `${translations[language].common.moreInfo}. `;
        const generalTitles = generalInfoData.map(item => item.title[language] || item.title.nl).join(', ');
        const accessibilityTitles = accessibilityInfoData.map(item => item.title[language] || item.title.nl).join(', ');
        if (generalTitles) textToSpeak += `${translations[language].common.general}: ${generalTitles}. `;
        if (accessibilityTitles) textToSpeak += `${translations[language].common.accessibility}: ${accessibilityTitles}.`;
    } else if (currentView === 'news') {
        textToSpeak += `${translations[language].common.news}. `;
        const newsTitles = newsData.map(item => item.title[language] || item.title.nl).join(', ');
        if (newsTitles) textToSpeak += newsTitles;
    } else { // Timetable, favorites, etc.
        if (currentView === 'favorites') {
            textToSpeak += `${translations[language].common.favorites}. `;
        } else if (currentView === 'friends-favorites') {
            textToSpeak += `${translations[language].common.friendsFavorites}. `;
        } else if (selectedEvent) {
            textToSpeak += `${selectedEvent}. `;
            if (selectedDate && selectedDate !== 'all-performances' && selectedDate !== 'calm-route') {
                textToSpeak += `${translations[language].common.onThisDay} ${selectedDate}. `;
            } else if (selectedDate === 'calm-route') {
                textToSpeak += `${translations[language].common.calmRoute}. `;
            } else {
                textToSpeak += `${translations[language].common.allPerformances} ${translations[language].common.forEvent.replace('%s', selectedEvent)}. `;
            }
        }

        const displayedTitles = formattedData.slice(0, 3).flatMap(group => 
            group.subGroups.flatMap(subGroup => 
                subGroup.items.slice(0, 3).map(item => {
                    const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;
                    return `${fullTitle} om ${item.time} in ${item.location}`;
                })
            )
        ).slice(0, 5);
        if (displayedTitles.length > 0) {
            textToSpeak += `De voorstellingen zijn: ${displayedTitles.join(', ')}.`;
        } else if (searchTerm) {
             textToSpeak += translations[language].common.noSearchResults.replace('%s', `'${searchTerm}'`);
        } else if (formattedData.length === 0) {
            textToSpeak += translations[language].common.noDataFound.replace('%s', selectedEvent || '');
        }
    }
    speak(textToSpeak, language);
  }, [isInitialLoad, language, uniqueEvents, friendsFavorites, currentView, selectedEvent, selectedDate, formattedData, searchTerm, speak, generalInfoData, accessibilityInfoData, newsData]);


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
          console.error("Export failed: element to capture is null.");
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
  }, [language, showMessageBox]);

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
  }, [favorites, language, showMessageBox, favoritesViewMode, timetableData]);

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
  }, [exportConfig, generateAndShareImage, language, showMessageBox]);


  useEffect(() => {
    const handleScroll = () => {
        if (isInitialLoad) {
            setShowStickyHeader(window.scrollY > 50);
        } else {
            setShowStickyHeader(true);
        }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isInitialLoad]);

  const returnToInitialView = useCallback(() => {
      handleAnimatedUpdate(() => {
        setCurrentView('timetable');
        setIsInitialLoad(true);
        setSelectedEvent(null);
        setSelectedDate(null);
        setSearchTerm('');
        setShowStickyHeader(false);
        try {
          const base = window.location.pathname.replace(/\/opencall$/, '');
          window.history.pushState({ view: 'initial' }, '', base + '#');
        } catch (e) {
          console.warn("Could not update history state:", e);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }, [handleAnimatedUpdate]);
  
  const handleViewChange = useCallback((view, event = null) => {
    handleAnimatedUpdate(() => {
        let hash = '#';
        if (view === 'timetable' && event) hash = `#${encodeURIComponent(event)}`;
        else if (view === 'favorites') hash = '#favorites';
        else if (view === 'friends-favorites') hash = '#friends-favorites';
        else if (view === 'more-info') hash = '#more-info';

        const newUrl = window.location.pathname.replace(/\/opencall$/, '') + hash;
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

            const futureDatesForEvent = timetableData
                .filter(item => {
                    if (item.event !== event || !item.date || item.date === 'N/A') return false;
                    const performanceDate = parseDateForSorting(item.date);
                    return performanceDate && performanceDate >= today;
                })
                .map(item => item.date);

            const firstUpcomingDate = [...new Set(futureDatesForEvent)]
                .sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b))[0];
            
            setSelectedDate(firstUpcomingDate || 'all-performances');
        } else if (view === 'favorites') {
            setSelectedDate('favorites-view');
        } else if (view === 'friends-favorites') {
            setSelectedDate('friends-favorites-view');
        } else if (view === 'more-info') {
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
            finalData = url.href;
        } catch (e) { console.error("Invalid URL for iframe:", data, e); }
    }
    setPopupContent({ type, data: finalData });
    setShowPopup(true);
  }, []); 

  const handleOpenCallSelect = useCallback((item) => {
      const itemText = item.tekst?.[language] || item.tekst?.nl;
      if (item.weergave && itemText) {
          openContentPopup('customText', {
              text: itemText,
              imageUrl: item.imageUrl
          });
          try {
              const base = window.location.pathname.replace(/\/opencall$/, '');
              window.history.pushState({ view: 'opencall' }, '', base + '/opencall');
          } catch (e) {
              console.warn("Could not update history state for Open Call:", e);
          }
      }
  }, [language, openContentPopup]);

  const closePopup = useCallback(() => {
      setShowPopup(false);
      stopSpeaking();
      if (window.location.pathname.endsWith('/opencall')) {
          try {
            const base = window.location.pathname.replace(/\/opencall$/, '');
            window.history.pushState({ view: 'initial' }, '', base + '#');
          } catch(e) {
            console.warn("Could not update history state:", e);
          }
      }
  }, [stopSpeaking]); 

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

    return () => {
      document.body.style.overflow = '';
      if (mainContentEl) mainContentEl.style.overflow = 'auto';
    };
  }, [showPopup, showPrivacyPolicy, messageBoxConfig.show, showExportModal, showImportPopup, cookieConsent]);

  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem('cookieConsent');
      if (storedConsent) {
        setCookieConsent(storedConsent);
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
      
      const storedAccessSettings = localStorage.getItem('ctfAccessibilitySettings');
      if (storedAccessSettings) {
        setAccessibilitySettings(prev => ({...prev, ...JSON.parse(storedAccessSettings)}));
      }

    } catch (e) { 
        console.error("Fout bij laden uit localStorage, cache wordt gewist:", e); 
        localStorage.clear();
    }
  }, []);

  useEffect(() => { localStorage.setItem('appLanguage', language); }, [language]);
  useEffect(() => { localStorage.setItem('ctfAccessibilitySettings', JSON.stringify(accessibilitySettings)); }, [accessibilitySettings]);

  useEffect(() => {
    const appElement = document.getElementById('app-container');
    if (!appElement) return;

    Object.entries(accessibilitySettings).forEach(([key, value]) => {
        const className = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        appElement.classList.toggle(className, value);
    });
  }, [accessibilitySettings, isInitialLoad]);

  // ========= WIJZIGING: Dependency array aangepast naar [] =========
  useEffect(() => {
    return () => {
      Object.values(notificationTimeouts.current).forEach(clearTimeout);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        };

        const [
            companies, performances, locations, executions,
            eventsData, sponsors, news, info, accessibility, marketing
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
            fetchAllDocuments(APPWRITE_CONFIG.collections.marketing) 
        ]);
        clearTimeout(timeoutId);

        const companiesMap = new Map(companies.map(c => [c.$id, c]));
        const performancesMap = new Map(performances.map(p => [p.$id, p]));
        const locationsMap = new Map(locations.map(l => [l.$id, l]));
        const executionsMap = new Map(executions.map(e => [e.$id, e]));
        const marketingMap = new Map(marketing.map(m => [m.PerformanceId, m]));

        const localEventInfoMap = {};
        let allParsedData = [];

        const eventsInApp = eventsData.filter(event => event.InApp === true);

        for (const eventDoc of eventsInApp) {
            localEventInfoMap[eventDoc.Name] = { 
                mapUrl: eventDoc.mapUrl,
                sponsorLogo: eventDoc.sponsorLogoUrl,
                dateString: null, 
            };

            if (!eventDoc.executionIds || eventDoc.executionIds.length === 0) continue;

            for (const execId of eventDoc.executionIds) {
                const execution = executionsMap.get(execId);
                if (!execution) continue;

                const performance = performancesMap.get(execution.performanceId);
                if (!performance) continue;
                
                const company = companiesMap.get(performance.companyId);
                const locationData = locationsMap.get(execution.locationId);
                if (!locationData) continue;

                const marketingInfo = marketingMap.get(performance.$id);

                const dateTime = new Date(execution.DateTime);
                if (isNaN(dateTime.getTime())) continue;
                
                const eventDate = dateTime.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const eventTime = dateTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

                const eventStartDate = parseDateForSorting(localEventInfoMap[eventDoc.Name].dateString);
                if (!eventStartDate || dateTime < eventStartDate) {
                    localEventInfoMap[eventDoc.Name].dateString = eventDate;
                }

                allParsedData.push({
                    id: execution.$id,
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
                    isCalmRoute: execution.quietRoute || false,
                    crowdLevel: execution.expectedCrowd || '',
                    artistImageUrl: performance.imageUrl || '',
                    safetyInfo: {
                        wheelchairAccessible: locationData.isWheelchairAccessible || false,
                        suitableForChildren: performance.isChildFriendly || false,
                        dutchLanguage: performance.isDutchLanguage || false,
                        englishLanguage: !performance.isDutchLanguage,
                        dialogueFree: performance.isDialogueFree || false,
                        diningFacility: locationData.hasDining || false,
                        hasNGT: execution.hasNgt || false,
                    },
                    marketingCredits: marketingInfo?.Credits || null,
                    marketingVoorstellingNL: marketingInfo?.VoorstellingstekstNL || null,
                    marketingVoorstellingENG: marketingInfo?.VoorstellingstekstENG || null,
                    marketingBioNL: marketingInfo?.BioNL || null,
                    marketingBioENG: marketingInfo?.BioENG || null,
                    marketingAfbeelding1: marketingInfo?.Afbeelding1 || null,
                    marketingAfbeelding2: marketingInfo?.Afbeelding2 || null,
                    marketingKeywords: marketingInfo?.Keywords || null,
                });
            }
        }
        
        const filteredDataForDisplay = allParsedData;
        
        const uniqueEventsForDisplay = Object.keys(localEventInfoMap)
            .filter(eventName => eventsInApp.some(e => e.Name === eventName))
            .sort((a,b) => (parseDateForSorting(localEventInfoMap[a]?.dateString) || 0) - (parseDateForSorting(localEventInfoMap[b]?.dateString) || 0));

        const tempGeneralInfoItems = info.map(item => ({
            title: { nl: item.NameNl, en: item.NameEng },
            url: { nl: item.MeerInfoNl, en: item.MeerInfoEng },
            imageUrl: item.MeerInfoAfbeelding,
            weergave: item.Weergave || false,
            tekst: { nl: item.TekstNL, en: item.TekstENG }
        }));
        
        const tempAccessibilityInfoItems = accessibility.map(item => ({
            title: { nl: item.ToegankelijkheidTitleNl, en: item.ToegankelijkheidTitleEng },
            url: { nl: item.ToegankelijkheidUrlNl, en: item.ToegankelijkheidUrlEng },
            imageUrl: item.ToegankelijkheidAfbeelding,
            weergave: item.Weergave || false,
            tekst: { nl: item.TekstNL, en: item.TekstENG }
        }));

        const tempNewsItems = news.map(item => ({
            title: { nl: item.NieuwsTitelNl, en: item.NieuwsTitelEng },
            url: { nl: item.NieuwsUrlNl, en: item.NieuwsUrlEng },
            imageUrl: item.NieuwsAfbeelding,
            weergave: item.Weergave || false,
            tekst: { nl: item.TekstNL, en: item.TekstENG }
        }));

        const tempBenefactorLogos = sponsors.map(item => ({ url: item.LogoSponsor, name: item.Name }));
        
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
            news: tempNewsItems, benefactors: tempBenefactorLogos, timestamp: new Date().getTime()
        }));
        
        return { generalInfo: tempGeneralInfoItems, timetable: filteredDataForDisplay };

    } catch (err) {
        console.error("Fout bij het ophalen van Appwrite gegevens:", err);
        const cached = localStorage.getItem('ctfAppwriteCache');

        if (cached) {
            setIsOffline(true);
            const { generalInfo } = JSON.parse(cached);
            return { generalInfo: generalInfo || [], timetable: timetableData };
        } else {
            if (err.name === 'AbortError') {
                 setError(translations[language].common.errorTimeout);
            } else {
                 setError(translations[language].common.errorLoading);
            }
        }
        return { generalInfo: [], timetable: timetableData };
    }
  }, [language, timetableData]);

  useEffect(() => {
    const init = async () => {
        setLoading(true);
        let dataFromCache = [];
        let generalInfoFromCache = [];
        
        try {
            const cached = localStorage.getItem('ctfAppwriteCache');
            if (cached) {
                const { data, eventInfoMap, uniqueEvents, generalInfo, accessibilityInfo, news, benefactors } = JSON.parse(cached);
                dataFromCache = data || [];
                generalInfoFromCache = generalInfo || [];
                setTimetableData(dataFromCache);
                setEventInfoMap(eventInfoMap || {});
                setUniqueEvents(uniqueEvents || []);
                setGeneralInfoData(generalInfoFromCache);
                setAccessibilityInfoData(accessibilityInfo || []);
                setNewsData(news || []);
                setBenefactorLogos(benefactors || []);
            }
        } catch (e) {
            console.error("Kon cache niet laden, cache wordt gewist", e);
            localStorage.clear();
        }
        
        const { generalInfo: fetchedGeneralInfo, timetable: fetchedTimetable } = await fetchDataFromAppwrite();
        const finalTimetableData = fetchedTimetable.length > 0 ? fetchedTimetable : dataFromCache;
        const finalGeneralInfo = fetchedGeneralInfo.length > 0 ? fetchedGeneralInfo : generalInfoFromCache;

        const openCalls = finalGeneralInfo.filter(item => {
            const titleNl = item.title?.nl || '';
            const titleEn = item.title?.en || '';
            return titleNl.toLowerCase().includes('open call') || titleEn.toLowerCase().includes('open call');
        });
        setOpenCallItems(openCalls);

        const urlParams = new URLSearchParams(window.location.search);
        const favoriteIndicesParam = urlParams.get('fav_indices');
        const favoriteIdsParam = urlParams.get('favorites');
        const path = window.location.pathname;

        let performancesToImport = [];

        if (favoriteIndicesParam) {
            try {
                const decodedIndices = atob(favoriteIndicesParam).split(',').map(Number);
                performancesToImport = decodedIndices.map(index => finalTimetableData[index]).filter(Boolean);
            } catch (e) { console.error("Error decoding favorite indices from URL", e); }
        } else if (favoriteIdsParam) {
            try {
                const decodedIds = atob(favoriteIdsParam).split(',');
                performancesToImport = finalTimetableData.filter(p => decodedIds.includes(p.id));
            } catch (e) { console.error("Error decoding favorite IDs from URL", e); }
        }

        if (performancesToImport.length > 0) {
            setSharedFavoritesForImport(performancesToImport);
            setShowImportPopup(true);
        } else if (path.endsWith('/opencall')) {
            const openCallItem = openCalls[0];
            if (openCallItem) {
                handleOpenCallSelect(openCallItem);
            }
        } else {
            const hash = window.location.hash.substring(1);
            if (hash && hash !== '#') {
                if (hash === 'favorites') handleViewChange('favorites');
                else if (hash === 'friends-favorites') handleViewChange('friends-favorites');
                else if (hash === 'more-info') handleViewChange('more-info');
                else handleViewChange('timetable', decodeURIComponent(hash));
            } else {
                try {
                    window.history.replaceState({ view: 'initial' }, '', window.location.pathname + '#');
                } catch(e) { console.warn("Could not update history state:", e); }
            }
        }
        
        setLoading(false);
    };

    init();

    const intervalId = setInterval(fetchDataFromAppwrite, 120000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [language, showMessageBox, closeMessageBox, openSettingsWithFallback]);

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
  }, [loading, permissionRequestDismissed, language, showMessageBox, closeMessageBox, openSettingsWithFallback]);

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
            if (delay > 0) {
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
  }, [language, showPermissionDialog, permissionRequestDismissed]);

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
  }, [language]);

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
  }, [language, scheduledCustomNotifications, permissionRequestDismissed, showPermissionDialog]);

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
  
  const handleScrollToNews = () => {
    newsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleCookieChoice = (choice) => {
    localStorage.setItem('cookieConsent', choice);
    setCookieConsent(choice);
    if (choice === 'all') {
        console.log("Marketing en analytics cookies zijn nu ingeschakeld.");
    }
  };
  
  const renderMainContent = () => {
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
                      generalInfoItems={generalInfoData.filter(item => !openCallItems.includes(item))}
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
                    <div className="flex flex-wrap justify-center items-center gap-4 my-8">
                        <EventViewSwitcher 
                            viewMode={currentViewMode} 
                            setViewMode={setViewModeFunction}
                            language={language} 
                            translations={translations} 
                            handleAnimatedUpdate={handleAnimatedUpdate}
                        />
                        {isFavorites && favorites.size > 0 && (
                          <button onClick={() => setShowExportModal(true)} className="px-4 py-2 rounded-lg font-semibold bg-green-500 hover:bg-green-600 text-white flex items-center gap-2">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                               {translations[language].common.exportFavorites}
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
                      speak={speak} 
                      iconFilters={iconFilters}
                      genreFilters={genreFilters}
                  />
                ) : (
                   <BlockTimetable allData={timetableData} favorites={favorites} friendsFavorites={friendsFavorites} toggleFavorite={toggleFavorite} selectedEvent={selectedEvent} openContentPopup={openContentPopup} translations={translations} language={language} isFavoritesView={isFavorites} isFriendsView={isFriendsFavorites} />
                )}
                
                {currentView !== 'block' && selectedEvent && eventInfoMap[selectedEvent]?.mapUrl && !loading && !error && (
                    <div className="mt-8 mb-8 w-full max-w-sm px-4 cursor-pointer mx-auto" onClick={() => openContentPopup('image', eventInfoMap[selectedEvent].mapUrl)}>
                        <h2 className="text-center text-white text-2xl font-bold mb-4">{translations[language].common.mapTitle.replace('%s', selectedEvent)}</h2>
                        <img src={eventInfoMap[selectedEvent].mapUrl} alt={`[Afbeelding van Kaart ${selectedEvent}]`} className="w-full h-auto rounded-lg shadow-lg border-4 border-white/50 hover:border-white transition-all"/>
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
          const state = event.state;
          const path = window.location.pathname;
          
          if (path.endsWith('/opencall')) {
              const openCallItem = openCallItems[0];
              if (openCallItem && !showPopup) {
                  handleOpenCallSelect(openCallItem);
              }
          } else if (!state || state.view === 'initial' || !window.location.hash) {
              returnToInitialView();
          } else if (state.view === 'detail') {
              handleAnimatedUpdate(() => {
                setIsInitialLoad(false);
                setCurrentView(state.currentView || 'timetable');
                setSelectedEvent(state.event);
                if(state.currentView === 'timetable') setEventViewMode(state.viewMode || 'card');
                setShowStickyHeader(true);
              });
          }
      };

      window.addEventListener('popstate', handlePopState);
      
      return () => {
          window.removeEventListener('popstate', handlePopState);
      };
  }, [returnToInitialView, handleAnimatedUpdate, openCallItems, handleOpenCallSelect, showPopup]);

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
    `}</style>
    <div id="app-container" className="min-h-screen bg-[#20747f] font-sans text-gray-100 flex flex-col items-center relative overflow-x-hidden">
      
      <StickyHeader 
          isVisible={showStickyHeader} 
          uniqueEvents={uniqueEvents} 
          handleEventClick={(e) => handleViewChange('timetable', e)} 
          handleFavoritesClick={() => handleViewChange('favorites')} 
          handleFriendsFavoritesClick={() => handleViewChange('friends-favorites')}
          handleMoreInfoClick={() => handleViewChange('more-info')}
          hasFriendsFavorites={friendsFavorites.size > 0}
          onLogoClick={handleStickyLogoClick} 
          selectedEvent={selectedEvent} 
          currentView={currentView} 
          language={language} 
          handleLanguageChange={handleLanguageChange} 
          translations={translations} 
          onReadPage={handleReadPage}
          openContentPopup={openContentPopup}
          isInitialLoad={isInitialLoad}
          openCallItems={openCallItems}
          onOpenCallSelect={handleOpenCallSelect}
      />
      
      <OfflineIndicator 
        isOffline={isOffline} 
        language={language} 
        translations={translations} 
        onRetry={fetchDataFromAppwrite}
      />
      
      <div className="w-full flex-grow flex flex-col">
          <div className="relative min-h-screen">
            <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${isInitialLoad ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
              <div className="w-full h-full flex flex-col items-center p-4 sm:p-6 md:p-8">
                <div className={`fixed inset-x-0 bottom-0 z-0 transition-opacity duration-700 ${isInitialLoad ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="relative w-full max-w-2xl mx-auto">
                    <img src="https://cafetheaterfestival.nl/wp-content/uploads/2025/06/CTF-2025-campagnebeeld-zonder-achtergrond-scaled.png" alt="[Afbeelding van campagnebeeld sfeer]" className="w-full h-auto pointer-events-none" />
                  </div>
                </div>
                <div className="relative z-10 w-full">
                  <div className="absolute top-12 left-4 flex flex-col space-y-2 items-start sm:flex-row sm:space-y-0 sm:space-x-2 sm:items-center">
                      <button onClick={() => openContentPopup('iframe', 'https://ldegroen.github.io/Stamgastenformulier/')} className="px-3 py-1 h-8 sm:h-10 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm font-semibold">
                        {translations[language].common.becomeRegularGuest}
                      </button>
                      <button onClick={() => setShowPrivacyPolicy(true)} className="px-3 py-1 h-8 sm:h-10 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm font-semibold">
                        {translations[language].common.privacyPolicy}
                      </button>
                  </div>
                  <TopRightControls 
                    language={language} 
                    handleLanguageChange={handleLanguageChange} 
                    onReadPage={handleReadPage} 
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
                          hasFriendsFavorites={friendsFavorites.size > 0}
                          uniqueEvents={uniqueEvents} 
                          language={language} 
                          translations={translations}
                          openCallItems={openCallItems}
                          onOpenCallSelect={handleOpenCallSelect}
                      />
                    </div>
                  )}
                </div>
              </div>
              <ScrollDownButton onClick={handleScrollToNews} translations={translations} language={language} />
            </div>

            <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${isInitialLoad ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
               <div id="main-content-area" className={`w-full h-full overflow-y-auto p-4 sm:p-6 md:p-8 ${showStickyHeader ? 'pt-24 sm:pt-20' : ''}`}>
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
          
          <AppFooter logos={benefactorLogos} language={language} translations={translations} />
      </div>
      <PopupModal showPopup={showPopup} closePopup={closePopup} popupContent={popupContent} language={language} translations={translations} speak={speak} />
      <PrivacyPolicyModal showPrivacyPolicy={showPrivacyPolicy} setShowPrivacyPolicy={setShowPrivacyPolicy} language={language} renderPrivacyPolicyContent={renderPrivacyPolicyContent} translations={translations} speak={speak} />
      <CustomTooltip showCustomTooltip={showCustomTooltip} customTooltipContent={customTooltipContent} customTooltipPosition={customTooltipPosition} />
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
      
      {!isInitialLoad && (
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

      <AccessibilityNudge 
          language={language} 
          translations={translations} 
          accessibilitySettings={accessibilitySettings} 
          setAccessibilitySettings={setAccessibilitySettings}
      />
      
      {cookieConsent === null && (
        <CookieConsentPopup
            onAcceptAll={() => handleCookieChoice('all')}
            onAcceptFunctional={() => handleCookieChoice('functional')}
            onDecline={() => handleCookieChoice('declined')}
            language={language}
            translations={translations}
        />
      )}

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
                      speak={() => {}}
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
