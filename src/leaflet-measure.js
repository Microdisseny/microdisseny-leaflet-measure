import pointOnFeature from '@turf/point-on-feature';

import '../scss/leaflet-measure.scss';

import units from './units';
import calc from './calc';

import symbology from './symbology';

L.Control.Measure = L.Control.extend({
    _className: 'leaflet-control-measure',
    options: {
        position: 'topleft',
        createButton: true,
        measureUnit: 'meters',
        measureArea: false
    },
    initialize: function(options) {
        L.setOptions(this, options);
    },
    onAdd: function(map) {
        this._map = map;
        this._measureArea = this.options.measureArea;
        this._layer = L.layerGroup().addTo(this._map);
        this._container = L.DomUtil.create('div', this._className + ' leaflet-bar');
        if (this.options.createButton){
            this._createButton(
                '&#8674;', 'Measure',
                'leaflet-control-measure leaflet-bar-part ' +
                'leaflet-bar-part-top-and-bottom', this._container,
                this.toggleMeasure, this);
        }
        return this._container;
    },
    onRemove: function(map) {
        this._clear();
        map.removeLayer(this._layer);
    },
    _createButton: function(html, title, className, container, fn, context) {
        const link = L.DomUtil.create('a', className, container);
        link.innerHTML = html;
        link.href = '#';
        link.title = title;

        L.DomEvent
            .on(link, 'click', L.DomEvent.stopPropagation)
            .on(link, 'click', L.DomEvent.preventDefault)
            .on(link, 'click', fn, context)
            .on(link, 'dblclick', L.DomEvent.stopPropagation);

        return link;
    },
    _createTooltip: function(position, layer) {
        const icon = L.divIcon({
            className: 'leaflet-measure-tooltip',
            iconAnchor: [-5, -5]
        });
        const tooltip = L.marker(position, {
            icon: icon,
            clickable: false
        });
        layer.addLayer(tooltip);
        return tooltip;
    },
    _initLayout: function() {

    },
    setMeasureArea: function(measureArea) {
        this._measureArea = measureArea;
    },
    startMeasuring: function(kwargs={'measureArea': false}) {
        if (this._measuring) {
            this._finishPath();
        }else{
            // TODO: setter
            this._measuring = true;
        }
        this._points = [];
        if ('measureArea' in kwargs) {
            this.setMeasureArea(kwargs.measureArea);
        }
        this._oldCursor = this._map._container.style.cursor;
        this._map._container.style.cursor = 'crosshair';
        L.DomUtil.addClass(this._container, 'leaflet-control-measure-on');

        this._doubleClickZoom = this._map.doubleClickZoom.enabled();
        this._map.doubleClickZoom.disable();

        L.DomEvent
            .on(this._map, 'mousemove', this._mouseMove, this)
            .on(this._map, 'click', this._mouseClick, this)
            .on(this._map, 'dblclick', this._finishPath, this)
            .on(document, 'keydown', this._onKeyDown, this);

        this._map.fire('measure:measurestart', {
            measureArea: kwargs.measureArea});

    },
    stopMeasuring: function() {
        if (this._measuring) {
            this._finishPath();
        }else{
            return;
        }
        this._measuring = false;
        this._map._container.style.cursor = this._oldCursor;
        L.DomUtil.removeClass(
            this._container, 'leaflet-control-measure-on');

        L.DomEvent
            .off(document, 'keydown', this._onKeyDown, this)
            .off(this._map, 'mousemove', this._mouseMove, this)
            .off(this._map, 'click', this._mouseClick, this)
            .off(this._map, 'dblclick', this._mouseClick, this);

        this._map.fire('measure:measurestop');

        if (this._doubleClickZoom) {
            this._map.doubleClickZoom.enable();
        }

        if (this._layerPaint) {
            this._layerPaint.clearLayers();
        }

        this._restartPath();
    },
    toggleMeasure: function() {
        this._measuring = !this._measuring;
        if (this._measuring) {
            this.startMeasuring();
        } else {
            this.stopMeasuring();
        }
    },
    _mouseMovePath: function(e) {
        if (!this._layerPathTemp && this._lastPoint) {
            this._layerPathTemp = L.polyline(
                [this._lastPoint, e.latlng], symbology.measurePathTemp
            ).addTo(this._layer);
            this._tooltipTemp = this._createTooltip(e.latlng, this._layer);

        } else {
            const latlngs = this._layerPathTemp.getLatLngs();
            if (this._lastPoint) {
                latlngs.pop();
            }
            this._layerPathTemp.setLatLngs([this._lastPoint, e.latlng]);
        }

        if (this._tooltipTemp && !this._measureArea) {
            this._updateTooltipPosition(this._tooltipTemp, e.latlng);
            const distance = e.latlng.distanceTo(this._lastPoint);
            let oldDistance = 0;
            if (this._layerPath){
                oldDistance = calc(
                    this._layerPath.getLayers()[0]._latlngs).length;
            }
            this._updateTooltipDistance(
                this._tooltipTemp, oldDistance + distance, distance);
        }
    },
    _mouseMoveArea: function(e) {
        if (this._layerAreaTemp) {
            const points = this._points.slice(0);
            points.push(e.latlng);
            this._layerAreaTemp.getLayers()[0].setLatLngs(points);
            if (this._tooltipTemp) {
                this._updateTooltipPosition(this._tooltipTemp, e.latlng);
                const measures = calc(points);
                this._updateTooltipArea(this._tooltipTemp, measures.area);
            }
        }
    },
    _mouseMove: function(e) {
        if (!e.latlng || !this._lastPoint) {
            return;
        }
        if (this._measureArea){
            this._mouseMoveArea(e);
            this._mouseMovePath(e);
        }else{
            this._mouseMovePath(e);
        }
    },
    _mouseClickPath: function(e) {
        if (this._lastPoint && !this._layerPath) {
            this._layerPath = L.layerGroup();
            this._layer.addLayer(this._layerPath);
            this._layerPath.addLayer(L.polyline([this._lastPoint],
                symbology.measurePath));
        }
        if (this._layerPath) {
            const path = this._layerPath.getLayers()[0];
            if (!this._measureArea){
                const oldDistance = calc(path._latlngs).length;
                path.addLatLng(e.latlng);
                const newDistance = calc(path._latlngs).length;
                const difference = newDistance - oldDistance;
                const tooltip = this._createTooltip(
                    e.latlng, this._layerPath);
                this._updateTooltipDistance(
                    tooltip, newDistance, difference);
            }else{
                path.addLatLng(e.latlng);
            }
        }
    },
    _mouseClickArea: function(e) {
        if (!this._layerAreaTemp && this._points.length == 2) {
            this._layerAreaTemp = L.layerGroup();
            this._layer.addLayer(this._layerAreaTemp);
            L.polygon(this._points, symbology.measureAreaTemp).addTo(
                this._layerAreaTemp);
        }

        if (this._measureArea && this._layerAreaTemp &&
                this._points.length > 3){
            this._layerAreaTemp.getLayers()[0].addLatLng(e.latlng);
        }

        if (!this._measureArea && this._layerPath) {
            this._createTooltip(e.latlng, this._layer);
        }
    },
    _mouseClick: function(e) {
        if (!e.latlng) {
            return;
        }
        this._points.push(e.latlng);
        if (this._measureArea){
            this._mouseClickPath(e);
            this._mouseClickArea(e);
        }else{
            this._mouseClickPath(e);
        }
        if (this._lastCircle) {
            this._layer.removeLayer(this._lastCircle);
        }
        const style = symbology.lastCircle;
        style['clickable'] = this._lastCircle ? true : false;
        this._lastCircle = new L.CircleMarker(e.latlng, style
        ).addTo(this._layer);

        this._lastCircle.on('click', function() {
            this._finishPath();
        }, this);

        this._lastPoint = e.latlng;
    },
    _finishPath: function() {
        if (this._lastCircle) {
            this._layer.removeLayer(this._lastCircle);
        }
        if (this._tooltipTemp) {
            this._layer.removeLayer(this._tooltipTemp);
        }
        if (this._layerPathTemp) {
            this._layer.removeLayer(this._layerPathTemp);
        }
        if (this._layerAreaTemp) {
            this._layer.removeLayer(this._layerPath);
            this._layer.removeLayer(this._layerAreaTemp);
            let layerAreaGrp = null;
            if (this._points.length > 2){
                layerAreaGrp = L.layerGroup().addTo(this._layer);
                const area = L.polygon(
                    this._points, symbology.measureArea).addTo(layerAreaGrp);
                const areaPoint = pointOnFeature(area.toGeoJSON());
                const tooltipPosition = L.latLng(
                    areaPoint.geometry.coordinates.slice(0).reverse()
                );
                const tooltip = this._createTooltip(
                    tooltipPosition, layerAreaGrp).addTo(this._layer);
                this._updateTooltipArea(tooltip, calc(this._points).area);
            }
            this._map.fire('measure:finishedpath', { layer: layerAreaGrp});
        }
        if (this._layerPath) {
            this._map.fire('measure:finishedpath', { layer: this._layerPath});
        }
        this._restartPath();
    },
    _restartPath: function() {
        this._points = [];
        this._tooltipTemp = undefined;
        this._lastCircle = undefined;
        this._lastPoint = undefined;
        this._layerPath = undefined;
        this._layerPathTemp = undefined;
        this._layerAreaTemp = undefined;
    },
    _clear: function() {

        if (this._lastCircle) {
            this._layer.removeLayer(this._lastCircle);
        }
        if (this._tooltip) {
            this._layer.removeLayer(this._tooltip);
        }
        if (this._layer && this._layerPathTemp) {
            this._layer.removeLayer(this._layerPathTemp);
        }
        if (this._layer && this._layerAreaTemp) {
            this._layer.removeLayer(this._layerAreaTemp);
        }
        this._restartPath();
    },
    _updateTooltipPosition: function(tooltip, position) {
        tooltip.setLatLng(position);
    },
    _updateTooltipDistance: function(tooltip, total, difference) {

        const measureUnit = units[this.options.measureUnit];
        const totalRound = (total * measureUnit.factor).toLocaleString(
            undefined, {
                minimumFractionDigits: measureUnit.decimals,
                maximumFractionDigits: measureUnit.decimals
            });
        const differenceRound = (difference * measureUnit.factor
        ).toLocaleString(undefined, {
            minimumFractionDigits: measureUnit.decimals,
            maximumFractionDigits: measureUnit.decimals
        });

        let text = '<div class="leaflet-measure-tooltip-total">';
        text += totalRound + measureUnit.display + '</div>';
        if (differenceRound > 0 && totalRound != differenceRound) {
            text += '<div class="leaflet-measure-tooltip-difference">(+';
            text += differenceRound + measureUnit.display + ')</div>';
        }
        tooltip._icon.innerHTML = text;
    },
    _updateTooltipArea: function(tooltip, area) {
        const measureUnit = units[this.options.measureUnit];
        const totalRound = (area * measureUnit.factor).toLocaleString(
            undefined, {
                minimumFractionDigits: measureUnit.decimals,
                maximumFractionDigits: measureUnit.decimals
            });
        let text = '<div class="leaflet-measure-tooltip-total">';
        text += totalRound;
        text += measureUnit.display + '<sup>2</sup>';
        text += '</div>';
        tooltip._icon.innerHTML = text;
    },
    _onKeyDown: function(e) {
        if (e.keyCode == 27) {
            if (!this._lastPoint) {
                this.stopMeasuring();
            } else {
                this._finishPath();
            }
        }
    }
});

L.control.measure = function(options) {
    return new L.Control.Measure(options);
};
