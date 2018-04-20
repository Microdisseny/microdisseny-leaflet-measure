# microdisseny-leaflet-measure

Measure control for [Leaflet](http://leafletjs.com) maps.


## Usage


```javascript
var measureControl = new L.Control.Measure({
    measureUnit: 'meters',
});
measureControl.addTo(map);
```

```javascript
var measureControl = new L.Control.Measure({
    measureUnit: 'meters',
    measureArea: true
});
measureControl.addTo(map);
```


## Control options

### position

`{position: 'topleft'}`

Standard Leaflet control [position options](http://leafletjs.com/reference.html#control-positions)

### createButton

`{createButton: true}`

### measureUnit

`{ measureUnit: 'meters' }`

Units used to display length results.

Valid values in src/units.js


### measureArea

Measure type (path or area)


## Events

You can subscribe to the following events on the [Map](http://leafletjs.com/reference.html#map-class) using [these methods](http://leafletjs.com/reference.html#events)

### measure:measurestart

Fired when measurement starts

### measure:measurestop

Fired when measurement stops

### measure:finishedpath

Fired when successfully measurement finishes.

## Development

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production
npm run build

```

## Credits

- Alexandre Busquets Triola

This project is based in:

- https://github.com/kartenkarsten/leaflet.measure
- https://github.com/ljagis/leaflet-measure
