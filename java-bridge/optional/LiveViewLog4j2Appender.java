package com.cashi.liveview;

import org.apache.logging.log4j.core.Appender;
import org.apache.logging.log4j.core.Core;
import org.apache.logging.log4j.core.Filter;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.plugins.Plugin;
import org.apache.logging.log4j.core.config.plugins.PluginAttribute;
import org.apache.logging.log4j.core.config.plugins.PluginElement;
import org.apache.logging.log4j.core.config.plugins.PluginFactory;

/**
 * OPTIONAL Log4j2 → Live View bridge.
 *
 * Lives in java-bridge/optional/ because it needs log4j-core on the compile
 * classpath (the rest of the bridge is dependency-free). Copy it next to the
 * other com.cashi.liveview classes inside CashiMobileAutomation, where Log4j2
 * is already a dependency.
 *
 * Register in log4j2.xml:
 *
 *   <Configuration packages="com.cashi.liveview">
 *     <Appenders>
 *       <LiveView name="LiveView" source="FRAMEWORK"/>
 *       ...
 *     </Appenders>
 *     <Loggers>
 *       <Root level="info">
 *         <AppenderRef ref="LiveView"/>
 *         ...
 *       </Root>
 *     </Loggers>
 *   </Configuration>
 *
 * The appender delegates to LiveViewClient, which is asynchronous and
 * best-effort, so log volume never slows the test run.
 */
@Plugin(name = "LiveView", category = Core.CATEGORY_NAME, elementType = Appender.ELEMENT_TYPE)
public final class LiveViewLog4j2Appender extends AbstractAppender {

    private final String source;

    private LiveViewLog4j2Appender(String name, Filter filter, String source) {
        super(name, filter, null, true, null);
        this.source = source;
    }

    @PluginFactory
    public static LiveViewLog4j2Appender createAppender(
            @PluginAttribute("name") String name,
            @PluginAttribute(value = "source", defaultString = "FRAMEWORK") String source,
            @PluginElement("Filter") Filter filter) {
        return new LiveViewLog4j2Appender(name != null ? name : "LiveView", filter, source);
    }

    @Override
    public void append(LogEvent event) {
        LiveViewClient client = LiveViewClient.getInstance();
        if (!client.isEnabled()) {
            return;
        }
        // Guard against feedback loops from the bridge's own diagnostics.
        String loggerName = event.getLoggerName();
        if (loggerName != null && loggerName.startsWith("com.cashi.liveview")) {
            return;
        }
        client.log(source, event.getLevel().name(), event.getMessage().getFormattedMessage());
    }
}
