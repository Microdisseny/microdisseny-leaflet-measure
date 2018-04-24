// measure calculations

import length from '@turf/length';
import area from '@turf/area';

/* calc measurements for an array of points */
export default function calc(latlngs, isArea=false) {
    const path = latlngs.map(latlng => [latlng.lat, latlng.lng]);
    const polyline = L.polyline(path);
    if (isArea){
        polyline.addLatLng(latlngs[0])
    }
    const meters = length(polyline.toGeoJSON(), { units: 'kilometers' }) * 1000;

    let sqMeters = null;
    if (isArea){
        const polygon = L.polygon(path);
        sqMeters = area(polygon.toGeoJSON());
    }
    return {
        length: meters,
        area: sqMeters
    };
}
