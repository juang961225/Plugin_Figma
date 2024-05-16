figma.showUI(__html__, { width: 1200, height: 600 });

interface FrameData {
  id: string;
  country: string;
  size: string;
  elements: string[];
}

figma.ui.onmessage = async (msg: { type: string; pageId?: string; frameId?: string }) => {
  if (msg.type === 'load-data') {
    sendPagesAndFrames();
  } else if (msg.type === 'show-elements') {
    const { pageId, frameId } = msg;
    if (pageId && frameId) {
      showElements(pageId, frameId);
    }
  } else if (msg.type === 'export-csv' && msg.pageId) {
    exportStructureToCSV(msg.pageId);
  } else if (msg.type === 'preview-csv' && msg.pageId) {
    previewCSV(msg.pageId); // Llama a la función para mostrar la vista previa del CSV
  }
};

function sendPagesAndFrames(): void {
  const pages = figma.root.children
    .filter((node) => node.type === 'PAGE')
    .map((page) => {
      const frames = page.children
        .filter((node) => node.type === 'FRAME')
        .map((frame) => ({ id: frame.id, name: frame.name }));

      return { id: page.id, name: page.name, frames };
    });

  figma.ui.postMessage({ type: 'pages-and-frames', data: pages });
}

function showElements(pageId: string, frameId: string): void {
  const page = figma.getNodeById(pageId) as PageNode;
  const frame = page.findOne((node) => node.type === 'FRAME' && node.id === frameId) as FrameNode;

  const elementNames = frame.children.map((element) => element.name);
  figma.ui.postMessage({ type: 'element-names', data: elementNames });
}

function exportStructureToCSV(pageId: string): void {
  const data: any = [];

  const page = figma.getNodeById(pageId) as PageNode;
  if (!page) return;

  page.children.forEach((frame) => {
    if (frame.type === 'FRAME') {
      const frameNameParts = frame.name.split('_');
      const id = frameNameParts[0];
      const country = frameNameParts[1];
      const size = frameNameParts[2];

      const frameData = {
        id,
        country,
        size,
        elements: {} as { [key: string]: string }, // Utilizamos un objeto en lugar de un array
      };

      // Recorrer todos los elementos dentro del frame y sus elementos anidados
      const elements = getAllElements(frame);
      elements.forEach(element => {
        const elementName = element.name;
        const lowerCaseElementName = elementName.toLowerCase();
        if (lowerCaseElementName.includes('__extract')) {
          // Identificar el header correspondiente y asignar el valor al objeto de elementos
          const header = identifyHeader(elementName);
          if (header) {
            if (!frameData.elements[header]) {
              frameData.elements[header] = elementName;
            } else {
              // Si ya hay un valor para este header, moverlo a la siguiente fila de oferta 1
              if (header === 'Oferta 1') {
                frameData.elements[header + ' (continued)'] = frameData.elements[header];
                frameData.elements[header] = '';
              } else {
                // Si el header no es 'Oferta 1', simplemente añadirlo como una nueva fila
                frameData.elements[header] += '\n' + elementName;
              }
            }
          }
        }
      });

      data.push(frameData);
    }
  });

  // Convertir los datos a formato CSV
  const csv = convertDataToCSV(data);

  // Enviar el contenido del archivo CSV a ui.html para su descarga
  figma.ui.postMessage({ type: 'download-csv', csv, filename: 'estructura.csv' });
}

// Función para identificar el header correspondiente a un elemento
function identifyHeader(elementName: string): string | null {
  const headers = ['Background', 'H1', 'Oferta 1', 'Oferta 2', 'Precio', 'CTA', 'Sello'];
  const lowerCaseElementName = elementName.toLowerCase();

  for (const header of headers) {
    if (lowerCaseElementName.includes(header.toLowerCase())) {
      return header;
    }
  }

  return null; // Si no se encuentra ningún header correspondiente, devolver null
}

// Función para convertir los datos a formato CSV
function convertDataToCSV(data: any[]): string {
  const headers = ['ID', 'Pais', 'Tamaño', 'Background', 'H1', 'Oferta 1', 'Oferta 2', 'Precio', 'CTA', 'Sello'];
  let csv = headers.join(',') + '\n';

  data.forEach((record: { id: string; country: string; size: string; elements: { [key: string]: string } }) => {
    const row = [
      record.id,
      record.country,
      record.size,
      ...headers.slice(3).map(header => record.elements[header] || '') // Utilizamos || '' para manejar los valores nulos
    ];
    csv += row.join(',') + '\n';
  });

  return csv;
}

// Función para obtener todos los elementos dentro de un nodo y sus elementos anidados
function getAllElements(node: FrameNode): SceneNode[] {
  let allElements: SceneNode[] = [];

  if (node.children) {
    node.children.forEach(child => {
      allElements.push(child);
      allElements.push(...getAllElements(child as FrameNode)); // Asegúrate de que el hijo sea un FrameNode antes de llamar a getAllElements
    });
  }

  return allElements;
}

// Función para mostrar la vista previa del CSV
function previewCSV(pageId: string): void {
  // Obtener los datos de la página seleccionada y formatearlos como CSV
  const data: any[] = [];
  const page = figma.getNodeById(pageId) as PageNode;

  if (!page) {
    console.error('No se encontró la página con el ID especificado.');
    return;
  }

  page.children.forEach((frame) => {
    if (frame.type === 'FRAME') {
      const frameNameParts = frame.name.split('_');
      const id = frameNameParts[0];
      const country = frameNameParts[1];
      const size = frameNameParts[2];

      const frameData = {
        id,
        country,
        size,
        elements: {} as { [key: string]: string },
      };

      // Recorrer todos los elementos dentro del frame y sus elementos anidados
      const elements = getAllElements(frame);
      elements.forEach(element => {
        const elementName = element.name;
        const lowerCaseElementName = elementName.toLowerCase();
        if (lowerCaseElementName.includes('__extract')) {
          // Identificar el header correspondiente y asignar el valor al objeto de elementos
          const header = identifyHeader(elementName);
          if (header) {
            if (!frameData.elements[header]) {
              frameData.elements[header] = elementName;
            } else {
              // Si ya hay un valor para este header, moverlo a la siguiente fila de oferta 1
              if (header === 'Oferta 1') {
                frameData.elements[header + ' (continued)'] = frameData.elements[header];
                frameData.elements[header] = '';
              } else {
                // Si el header no es 'Oferta 1', simplemente añadirlo como una nueva fila
                frameData.elements[header] += '\n' + elementName;
              }
            }
          }
        }
      });

      data.push(frameData);
    }
  });

  // Convertir los datos a formato CSV
  const csvPreview = convertDataToCSV(data);

  // Enviar el mensaje a la interfaz con la vista previa del CSV
  figma.ui.postMessage({ type: 'show-preview', preview: csvPreview });
}



