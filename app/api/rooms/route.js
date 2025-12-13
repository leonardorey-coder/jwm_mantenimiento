const fallbackRooms = [
  { id: 1, numero: '101', estado: 'Ocupado', prioridad: 'Alta' },
  { id: 2, numero: '102', estado: 'Libre', prioridad: 'Media' },
  { id: 3, numero: '201', estado: 'Mantenimiento', prioridad: 'Crítica' },
];

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const response = await fetch(`${backendUrl}/api/rooms`);
    if (!response.ok) throw new Error('Respuesta no OK del backend');

    const data = await response.json();
    return Response.json({ source: 'backend', data });
  } catch (error) {
    return Response.json(
      { source: 'mock', data: fallbackRooms, error: error.message },
      { status: 200 }
    );
  }
}
