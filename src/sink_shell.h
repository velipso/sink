// (c) Copyright 2016-2018, Sean Connelly (@voidqk), http://sean.cm
// MIT License
// Project Home: https://github.com/voidqk/sink

#ifndef SINK_SHELL__H
#define SINK_SHELL__H

#include "sink.h"

void sink_shell_scr(sink_scr scr);
void sink_shell_ctx(sink_ctx ctx, int size, char **args, const char *sink_exe);

#endif // SINK_SHELL__H
