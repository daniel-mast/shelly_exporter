'use strict';

const rewire = require('rewire');

describe('shelly_exporter', function() {
  Shelly = jasmine.createSpyObj('Shelly', ['getComponentStatus', 'addStatusHandler']);
  HTTPServer = jasmine.createSpyObj('HTTPServer', ['registerEndpoint']);
  const ShellyExporter = rewire('../shelly_exporter.js');

  it('initialize', function() {
    expect(Shelly.getComponentStatus).toHaveBeenCalled();
    expect(Shelly.addStatusHandler).toHaveBeenCalledWith(jasmine.any(Function));
    expect(HTTPServer.registerEndpoint).toHaveBeenCalledWith('metrics', jasmine.any(Function));
  });

  it('http response', function() {
    expect(HTTPServer.registerEndpoint).toHaveBeenCalledWith('metrics', jasmine.any(Function));
    
    const response = jasmine.createSpyObj('response', ['send']);
    ShellyExporter.__with__(
    {
      CONFIG: {
        component: 'switch',
        id: 0,
        bucket: [ 1, 10, 20, 30, 40, 50, 100, 150, 200 ]
      },
      STORE: {
        status: {
          apower: 0.700000,
          voltage: 216.600000,
          current: 0.07800000,
          aenergy: {
              minute_ts: 1672066078
          }
        },
        energy: {
          bucket: [580,653,778,855,955,984,1009,1010,1010],
          count: 1011,
          sum: 180.600322
        }
      }
    })(function () {
      const endpointCallback = HTTPServer.registerEndpoint.calls.mostRecent().args[1];
      endpointCallback(null, response);
      expect(response.send).toHaveBeenCalled();
      expect(response.code).toBe(200);
      
      expect(response.body).toContain('# TYPE shelly_apower gauge');
      expect(response.body).toContain('shelly_apower 0.7');
      
      expect(response.body).toContain('# TYPE shelly_voltage gauge');
      expect(response.body).toContain('shelly_voltage 216.6');
      
      expect(response.body).toContain('# TYPE shelly_current gauge');
      expect(response.body).toContain('shelly_current 0.078');
      
      expect(response.body).toContain('# TYPE shelly_energy histogram');
      expect(response.body).toContain('shelly_energy_bucket{le=1} 580 1672066078');
      expect(response.body).toContain('shelly_energy_bucket{le=10} 653 1672066078');
      expect(response.body).toContain('shelly_energy_bucket{le=100} 1009 1672066078');
      expect(response.body).toContain('shelly_energy_bucket{le=200} 1010 1672066078');
      expect(response.body).toContain('shelly_energy_bucket{le="+Inf"} 1011 1672066078');
      expect(response.body).toContain('shelly_energy_count 1011 1672066078');
      expect(response.body).toContain('shelly_energy_sum 180.600322 1672066078');
    });
  });

  it('apower event', function() {
    expect(Shelly.addStatusHandler).toHaveBeenCalledWith(jasmine.any(Function));
    ShellyExporter.__with__(
    {
      STORE: {
        status: {}
      }
    })(function () {
      const statusHandlerCallback = Shelly.addStatusHandler.calls.mostRecent().args[0];
      const status_data = { name: "switch", id: 0, delta: { apower: 0.700000 } };
      statusHandlerCallback(status_data);
      expect(ShellyExporter.__get__("STORE").status.apower).toBe(0.700000);
    });
  });

  it('voltage event', function() {
    expect(Shelly.addStatusHandler).toHaveBeenCalledWith(jasmine.any(Function));
    ShellyExporter.__with__(
    {
      STORE: {
        status: {}
      }
    })(function () {
      const statusHandlerCallback = Shelly.addStatusHandler.calls.mostRecent().args[0];
      const status_data = { name: "switch", id: 0, delta: { voltage: 216.600000 } };
      statusHandlerCallback(status_data);
      expect(ShellyExporter.__get__("STORE").status.voltage).toBe(216.600000);
    });
  });
  
  it('current event', function() {
    expect(Shelly.addStatusHandler).toHaveBeenCalledWith(jasmine.any(Function));
    ShellyExporter.__with__(
    {
      STORE: {
        status: {}
      }
    })(function () {
      const statusHandlerCallback = Shelly.addStatusHandler.calls.mostRecent().args[0];
      const status_data = { name: "switch", id: 0, delta: { current: 0.078000 } };
      statusHandlerCallback(status_data);
      expect(ShellyExporter.__get__("STORE").status.current).toBe(0.078000);
    });
  });

  it('aenergy event', function() {
    expect(Shelly.addStatusHandler).toHaveBeenCalledWith(jasmine.any(Function));
    ShellyExporter.__with__(
    {
      CONFIG: {
        component: 'switch',
        id: 0,
        bucket: [ 1, 2, 5, 10, 20, 50, 100 ]
      },
      STORE: {
        status: {},
        energy: {
          bucket: [ 0, 0, 0, 0, 0, 0, 0 ],
          count: 0,
          sum: 0
        }
      }
    })(function () {
      const statusHandlerCallback = Shelly.addStatusHandler.calls.mostRecent().args[0];
      let status_data = { name: "switch", id: 0, delta: { aenergy: { by_minute: [37.346000], minute_ts: 1672065958 } } };
      statusHandlerCallback(status_data);
      expect(ShellyExporter.__get__("STORE").status.aenergy.minute_ts).toEqual(1672065958);
      expect(ShellyExporter.__get__("STORE").energy.bucket).toEqual([ 0, 0, 1, 1, 1, 1, 1 ]);
      expect(ShellyExporter.__get__("STORE").energy.count).toEqual(1);
      expect(ShellyExporter.__get__("STORE").energy.sum).toBeCloseTo(0.037346, 6);
      
      status_data = { name: "switch", id: 0, delta: { aenergy: { by_minute: [34.752000, 37.346000], minute_ts: 1672066018 } } };
      statusHandlerCallback(status_data);
      expect(ShellyExporter.__get__("STORE").status.aenergy.minute_ts).toEqual(1672066018);
      expect(ShellyExporter.__get__("STORE").energy.bucket).toEqual([ 0, 0, 2, 2, 2, 2, 2 ]);
      expect(ShellyExporter.__get__("STORE").energy.count).toEqual(2);
      expect(ShellyExporter.__get__("STORE").energy.sum).toBeCloseTo(0.072098, 6);
      
      status_data = { name: "switch", id: 0, delta: { aenergy: { by_minute: [34.752000, 34.752000, 37.346000], minute_ts: 1672066078 } } };
      statusHandlerCallback(status_data);
      expect(ShellyExporter.__get__("STORE").status.aenergy.minute_ts).toEqual(1672066078);
      expect(ShellyExporter.__get__("STORE").energy.bucket).toEqual([ 0, 0, 3, 3, 3, 3, 3 ]);
      expect(ShellyExporter.__get__("STORE").energy.count).toEqual(3);
      expect(ShellyExporter.__get__("STORE").energy.sum).toBeCloseTo(0.10685, 6);
    });
  });
});