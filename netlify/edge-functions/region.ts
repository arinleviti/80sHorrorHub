type GeoContext = {
  geo?: {
    country?: {
      code?: string;
    };
  };
};

const handler = (request: Request, context: GeoContext) => {
  const EU_COUNTRIES = [
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI',
    'FR','DE','GR','HU','IE','IT','LV','LT','LU',
    'MT','NL','PL','PT','RO','SK','SI','ES','SE'
  ];

  const country = context.geo?.country?.code || '';
  const isEU = EU_COUNTRIES.includes(country);
 console.log('[region edge] country:', country, 'isEU:', isEU);
  return Response.json({ isEU });
};

export default handler;