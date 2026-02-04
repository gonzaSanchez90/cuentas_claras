import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Category, User } from "../types";

// Initialize Gemini client
// Vite replaces import.meta.env.VITE_API_KEY with the actual value during build
const apiKey = import.meta.env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
const genAI = new GoogleGenerativeAI(apiKey || "");

const MODEL_NAME = "gemini-1.5-flash";

export const parseExpenseString = async (input: string): Promise<{
    title: string;
    amount: number;
    payer: User;
    category: Category;
    date: string;
} | null> => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const categoriesList = Object.values(Category).join(", ");

        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING },
                        amount: { type: SchemaType.NUMBER },
                        payer: { type: SchemaType.STRING, enum: ["Me", "Partner"] },
                        category: { type: SchemaType.STRING, enum: Object.values(Category) },
                        date: { type: SchemaType.STRING, description: "Format YYYY-MM-DD" },
                    },
                    required: ["title", "amount", "payer", "category", "date"],
                },
            },
        });

        const result = await model.generateContent(`Extract expense details from this text: "${input}". 
      Today is ${today}.
      If payer is unclear, default to "Me".
      Categories are strictly: ${categoriesList}.
      Map "casa" or "home" to "In-house".
      Return JSON.`);

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
        const summary = expenses.map(e => `${e.date}: ${e.title} (${e.category}) - $${e.amount}`).join('\n');

        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(`Analiza estos gastos y dame 3 insights breves y útiles sobre hábitos de consumo o anomalías. Sé amigable y directo (en Español).\n\n${summary}`);

        return result.response.text() || "No se pudo generar el análisis.";
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return "Error al conectar con la IA.";
    }
};