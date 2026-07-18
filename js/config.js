/* ============================================================= */
/* CONFIG — Supabase (base de datos del panel administrativo)     */
/* La anon key es PÚBLICA por diseño (va en el navegador). La      */
/* seguridad real la dan las políticas RLS de la base de datos:   */
/* el público solo puede INSERTAR pedidos, jamás leerlos; solo el  */
/* admin autenticado puede leer. NO poner aquí la service_role.    */
/* ============================================================= */
const SUPABASE_URL = "https://wwdfxhtecrdmeswbnqqd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZGZ4aHRlY3JkbWVzd2JucXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNTIyMTQsImV4cCI6MjA5OTkyODIxNH0.lALje3WKREtyIjZCL3Ee8j4xszySoexZuf4iq6T1scA";
