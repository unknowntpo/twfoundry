import assert from 'node:assert/strict';
import {
  formatRouteOperatorNames,
  routeOperatorsFromContext,
} from '../src/busRouteOperators.js';

const routeContext = {
  stopOfRoutes: [
    {
      RouteUID: 'TPE_TEST',
      Direction: 0,
      Operators: [
        {
          OperatorID: '100',
          OperatorName: { Zh_tw: '臺北客運', En: 'Taipei Bus Co., Ltd.' },
          OperatorCode: 'TaipeiBus',
          OperatorNo: '1407',
        },
        {
          OperatorID: '200',
          OperatorName: { Zh_tw: '首都客運', En: 'Capital Bus Co., Ltd.' },
          OperatorCode: 'CapitalBus',
          OperatorNo: '0913',
        },
      ],
    },
    {
      RouteUID: 'TPE_TEST',
      Direction: 1,
      Operators: [
        {
          OperatorID: '100',
          OperatorName: { Zh_tw: '臺北客運', En: 'Taipei Bus Co., Ltd.' },
          OperatorCode: 'TaipeiBus',
          OperatorNo: '1407',
        },
      ],
    },
  ],
};

const outboundOperators = routeOperatorsFromContext(routeContext, { direction: 0 });
assert.deepEqual(outboundOperators.map((operator) => operator.name), ['臺北客運', '首都客運']);
assert.equal(formatRouteOperatorNames(outboundOperators), '臺北客運、首都客運');

const inboundOperators = routeOperatorsFromContext(routeContext, { direction: 1 });
assert.equal(formatRouteOperatorNames(inboundOperators), '臺北客運');

const allOperators = routeOperatorsFromContext(routeContext);
assert.equal(formatRouteOperatorNames(allOperators), '臺北客運、首都客運');

assert.equal(formatRouteOperatorNames([]), '營運業者待補');
