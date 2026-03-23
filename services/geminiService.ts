import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Category, Participant } from "../types";

const apiKey = import.meta.env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
const genAI = new GoogleGenerativeAI(apiKey || "");

const MODEL_NAME = "gemini-1.5-flash";

export const parseExpenseString = async (input: string, participants: Participant[]): Promise<{
    title: string;
    amount: number;
    payerNameMatched: string;
    category: Category;
    date: string;
} | null> => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const participantNames = participants.map(p => p.name).join(", ");

        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING },
                        amount: { type: SchemaType.NUMBER },
                        payerNameMatched: { type: SchemaType.STRING, description: `Must be exactly one of: ${participantNames}` },
                        category: { type: SchemaType.STRING, enum: Object.values(Category) },
                        date: { type: SchemaType.STRING, description: "Format YYYY-MM-DD" },
                    },
                    required: ["title", "amount", "payerNameMatched", "category", "date"],
                },
            },
        });

        const result = await model.generateContent(`Eres un asistente para clasificar gastos compartidos de convivientes en español.
Analiza el siguiente texto y extrae los datos del gasto.

TEXTO: "${input}"
HOY: ${today}
PARTICIPANTES DISPONIBLES: [${participantNames}]

REGLAS PARA CATEGORIA — elige la más apropiada según el contexto real:
- "Salidas": restaurantes, bares, cenas fuera de casa, tapas, cafés con amigos, cine, ocio, copas, brunch. Palabras clave: cena, almuerzo fuera, bar, restaurante, copas, tapas, café con amigos, pizza, sushi, hamburguesería.
- "Supermercado": compra del super, mercado, frutas, verduras, Mercadona, Carrefour, Dia, alimentación para casa.
- "Alquiler": alquiler mensual del piso, renta.
- "Luz": electricidad, factura de la luz, Endesa, Iberdrola.
- "Agua": factura del agua.
- "Internet": wifi, fibra óptica, internet, router.
- "Teléfono": factura del móvil, Movistar, Orange, Vodafone.
- "Transporte": Uber, taxi, metro, bus, gasolina, parking, tren, avión, vuelo, Cabify, Blablacar.
- "Gastos del hogar": compras para el hogar, productos de limpieza, muebles, electrodomésticos, Amazon (artículos para casa), ferretería.
- "Farmacia": medicamentos, farmacia, médico, parafarmacia, vitaminas.
- "Obra Social": seguridad social, seguro médico, cuotas.
- "Suscripciones": Netflix, Spotify, Amazon Prime, Disney+, YouTube Premium, HBO, Twitch.
- "Varios": cualquier otra cosa que no encaje claramente en las anteriores.

REGLAS PARA PAGADOR:
- Busca el nombre en el texto. Gonza/Gonzalo → elige el participante que más se parezca.
- Si no se menciona nombre, elige el primer participante de la lista.
- DEBES devolver exactamente uno de los nombres de la lista: [${participantNames}]

REGLAS PARA TITULO:
- Extrae el concepto principal del gasto de forma breve (ej: "cena" → "Cena", "compra super" → "Supermercado", "uber al trabajo" → "Uber al trabajo").
- Primera letra en mayúscula, en español.

REGLAS PARA FECHA (formato YYYY-MM-DD):
- Si no se menciona fecha → usa hoy: ${today}
- "ayer" → ${new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]}
- "anteayer" → ${new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0]}
- Si se menciona día de la semana, calcúlalo respecto a hoy.

Devuelve SOLO JSON con: title, amount, payerNameMatched, category, date.`);

        const text = result.response.text();
        if (text) {
            return JSON.parse(text);
        }
        return null;
    } catch (error) {
        console.error("Gemini Parse Error:", error);
        return null;
    }
};

export const analyzeSpendingHabits = async (expenses: any[]): Promise<string> => {
    try {
        const summary = expenses.map(e => `${e.date}: ${e.title} (${e.category}) - $${e.amount}`).join('\\n');
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(`Analiza estos gastos y dame 3 insights breves y \xFAtiles sobre h\xE1bitos de consumo o anomal\xEDas. S\xE9 amigable y directo (en Espa\xF1ol).\\n\\n${summary}`);
        return result.response.text() || "No se pudo generar el an\xE1lisis.";
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return "Error al conectar con la IA.";
    }
};