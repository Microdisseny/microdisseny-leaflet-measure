// measure calculations

import length from '@turf/length';
import area from '@turf/area';

/* calc measurements for an array of points */
export default function calc(latlngs) {
    //const last = latlngs[latlngs.length - 1];
    const path = latlngs.map(latlng => [latlng.lat, latlng.lng]);

    const polyline = L.polyline(path),
        polygon = L.polygon(path);
    const meters = length(polyline.toGeoJSON(), { units: 'kilometers' }) * 1000;
    const sqMeters = area(polygon.toGeoJSON());

    return {
        length: meters,
        area: sqMeters
    };
}
