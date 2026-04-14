import { NextRequest, NextResponse } from 'next/server';

const EU_COUNTRIES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI',
  'FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT',
  'RO','SK','SI','ES','SE'];

export async function GET(request: NextRequest) {
  const country = request.headers.get('x-nf-country') ?? 'US';
  const isEU = EU_COUNTRIES.includes(country);
  console.log(`[region API] country: ${country}, isEU: ${isEU}`);
  return NextResponse.json({ isEU });
}