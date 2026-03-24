# Cuentas Claras – Gestión Inteligente de Gastos Compartidos 🚀

**Cuentas Claras** es una solución web de alto rendimiento diseñada para simplificar y automatizar la gestión de gastos en grupos, viajes y convivencias. Esta plataforma permite un seguimiento exhaustivo de contribuciones financieras, garantizando un equilibrio equitativo y transparente entre todos los participantes.

## 💎 Propuesta de Valor

Desarrollada bajo estándares de calidad premium, la aplicación ofrece una experiencia de usuario (UX) fluida y sofisticada, combinando una estética *Dark Mode* vanguardista con algoritmos precisos de conciliación de saldos. 

### Características Principales:
- **Gestión Multi-Cálculo**: Organización por periodos mensuales o eventos específicos.
- **Sistema de Invitación Dinámica**: Generación de enlaces únicos para la integración inmediata de nuevos participantes.
- **Algoritmo de Balance Automático**: Cálculo en tiempo real de deudas y saldos cruzados, minimizando el número de transacciones necesarias para saldar cuentas.
- **Visualización de Datos**: Gráficos analíticos e intuitivos para comprender la distribución del gasto por categoría.
- **Arquitectura Modular**: Diseñada siguiendo principios **SOLID** para una escalabilidad y mantenimiento óptimos.
- **Soporte Localizado**: Formateo de moneda ajustado a estándares europeos con soporte nativo para decimales inteligentes.

## 🛠 Stack Tecnológico

La infraestructura tecnológica de **Cuentas Claras** ha sido seleccionada para garantizar velocidad, seguridad y una excelente experiencia de desarrollo:

- **Frontend**: React 18 con Vite para una compilación ultra-rápida.
- **Estilos**: Tailwind CSS con un diseño personalizado de *glassmorphism* y micro-animaciones.
- **Backend**: Node.js con Express, proporcionando una API REST robusta y segura.
- **Persistencia**: SQLite gestionado mediante `sql.js`, ofreciendo una base de datos ligera y portátil sin dependencias externas pesadas.
- **Visualización**: Recharts para el renderizado de análisis estadísticos.

## 🏗 Arquitectura y Principios de Diseño

El proyecto ha sido sometido a una refactorización profunda para cumplir con los estándares de la industria, desacoplando la lógica de negocio de la interfaz de usuario:

- **Custom Hooks**: Manejo centralizado del estado y sincronización con la API.
- **Modularity**: UI dividida en componentes especializados (`DashboardView`, `MonthDetailView`, `SharedModals`).
- **Utility Driven**: Funciones matemáticas y de formateo aisladas para garantizar la testabilidad.

## 🚀 Instalación y Despliegue

### Requisitos Previos:
- Node.js (v18 o superior)
- npm o yarn

### Configuración Local:
```bash
# 1. Instalar dependencias del root y del servidor
npm install

# 2. Iniciar el entorno de desarrollo (concurrente)
npm run dev
```

### Protocolo de Despliegue (Producción):
El sistema está optimizado para plataformas como Render, Railway o DigitalOcean App Platform.

```bash
# Comando de construcción
npm run build

# Comando de inicio
npm start
```

---

*Desarrollado por gonzalo*
