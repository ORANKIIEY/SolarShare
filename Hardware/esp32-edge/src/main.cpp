#include "edge_service.h"

EdgeService edgeService;

void setup() {
    edgeService.initialize();
}

void loop() {
    edgeService.run();
    yield();  // prevent watchdog timeout
}
