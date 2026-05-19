import React from 'react';
import DOMPurify from 'dompurify';

const sanitize = (html) => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'u', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
});

export const applyFormatting = (text) => {
    const formatted = text
        .replace(/\[b\](.*?)\[b\]/g, '<strong>$1</strong>')
        .replace(/\[i\](.*?)\[i\]/g, '<em>$1</em>')
        .replace(/\[u\](.*?)\[u\]/g, '<u>$1</u>');
    return sanitize(formatted);
};

export const renderPrivacyPolicyContent = (content, textColorClass = 'text-gray-700') => {
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

export const renderGenericPopupText = (content) => {
  const lines = content.trim().split('\n\n');
  const elements = lines.map((line, index) => (
      <p key={`p-${index}`} dangerouslySetInnerHTML={{ __html: applyFormatting(line) }} className="mb-4 last:mb-0 text-black" />
  ));
  return elements;
};

export const CustomTextRenderer = ({ text, imageUrl, title = 'Afbeelding', textColorClass = 'text-white', layout = 'default' }) => {
    if (!text) return null;

    const parseLine = (line) => {
        line = applyFormatting(line);
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
        return DOMPurify.sanitize(line, {
            ALLOWED_TAGS: ['strong', 'em', 'u', 'a'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
        });
    };

    const elements = text.split('\n').map((line, index) => {
        let content = line.trim();

        const photoMatch = content.match(/^\[foto:(https?:\/\/[^\]]+)\]$/);
        if (photoMatch && photoMatch[1]) {
            return (
                <img
                    key={`img-${index}`}
                    src={photoMatch[1]}
                    alt="Ingevoegde afbeelding"
                    className="rounded-lg shadow-lg w-full h-auto object-cover my-6"
                    loading="lazy"
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
                        loading="lazy"
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
                    loading="lazy"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            )}
            {elements}
        </div>
    );
};
