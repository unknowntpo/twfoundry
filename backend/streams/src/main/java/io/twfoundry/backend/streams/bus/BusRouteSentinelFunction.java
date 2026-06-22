package io.twfoundry.backend.streams.bus;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.flink.api.common.state.MapState;
import org.apache.flink.api.common.state.MapStateDescriptor;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.typeinfo.TypeHint;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;

public final class BusRouteSentinelFunction
    extends KeyedProcessFunction<String, EnrichedBusVehicleObservation, BusRouteSignal> {
  private final BusRouteSentinelProcessor processor;
  private transient ValueState<String> currentSlotKey;
  private transient ValueState<List<EnrichedBusVehicleObservation>> slotBuffer;
  private transient MapState<String, Integer> bunchingStreaks;

  public BusRouteSentinelFunction(BusRouteSentinelProcessor processor) {
    this.processor = processor;
  }

  @Override
  public void open(Configuration parameters) {
    currentSlotKey = getRuntimeContext().getState(new ValueStateDescriptor<>("currentSlotKey", String.class));
    slotBuffer = getRuntimeContext().getState(new ValueStateDescriptor<>(
        "slotBuffer",
        TypeInformation.of(new TypeHint<List<EnrichedBusVehicleObservation>>() {})
    ));
    bunchingStreaks = getRuntimeContext().getMapState(new MapStateDescriptor<>("bunchingStreaks", String.class, Integer.class));
  }

  @Override
  public void processElement(
      EnrichedBusVehicleObservation observation,
      Context context,
      Collector<BusRouteSignal> out
  ) throws Exception {
    String activeSlot = currentSlotKey.value();
    if (activeSlot != null && !activeSlot.equals(observation.slotKey())) {
      flush(out);
    }

    currentSlotKey.update(observation.slotKey());
    List<EnrichedBusVehicleObservation> buffer = slotBuffer.value();
    if (buffer == null) buffer = new ArrayList<>();
    buffer.add(observation);
    slotBuffer.update(buffer);
  }

  @Override
  public void onTimer(long timestamp, OnTimerContext ctx, Collector<BusRouteSignal> out) throws Exception {
    flush(out);
  }

  private void flush(Collector<BusRouteSignal> out) throws Exception {
    List<EnrichedBusVehicleObservation> buffer = slotBuffer.value();
    if (buffer == null || buffer.isEmpty()) return;

    Map<String, Integer> priorStreaks = new HashMap<>();
    for (Map.Entry<String, Integer> entry : bunchingStreaks.entries()) {
      priorStreaks.put(entry.getKey(), entry.getValue());
    }

    BusRouteSentinelProcessor.ProcessResult result = processor.processSlot(buffer, priorStreaks);
    bunchingStreaks.clear();
    for (Map.Entry<String, Integer> entry : result.bunchingStreaks().entrySet()) {
      bunchingStreaks.put(entry.getKey(), entry.getValue());
    }
    for (BusRouteSignal signal : result.signals()) {
      out.collect(signal);
    }

    slotBuffer.clear();
  }
}
