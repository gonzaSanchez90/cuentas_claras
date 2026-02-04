import { GoogleGenAI, Type } from "@google/genai";
import { Category, User } from "../types";

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-3-flash-preview";

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

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Extract expense details from this text: "${input}". 
      Today is ${today}.
      If payer is unclear, default to "Me".
      Categories are strictly: ${categoriesList}.
      Map "casa" or "home" to "In-house".
      Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        payer: { type: Type.STRING, enum: ["Me", "Partner"] },
                        category: { type: Type.STRING, enum: Object.values(Category) },
                        date: { type: Type.STRING, description: "Format YYYY-MM-DD" },
                    },
                    required: ["title", "amount", "payer", "category", "date"],
                },
            },
        });

        if (response.text) {
            return JSON.parse(response.text);
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

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Analiza estos gastos y dame 3 insights breves y útiles sobre hábitos de consumo o anomalías. Sé amigable y directo (en Español).\n\n${summary}`,
        });

        return response.text || "No se pudo generar el análisis.";
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return "Error al conectar con la IA.";
    }
};