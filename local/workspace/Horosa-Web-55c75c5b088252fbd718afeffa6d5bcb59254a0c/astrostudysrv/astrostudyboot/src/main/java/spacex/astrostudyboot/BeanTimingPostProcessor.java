package spacex.astrostudyboot;

import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.PriorityOrdered;
import org.springframework.stereotype.Component;

/**
 * PERF-R8:bean 级启动计时(纯观测,默认关;HOROSA_BEAN_TIMING=1 开)。
 *
 * 背景:全局 lazy-init A/B 实测不采纳(XML component-scan 给全部应用 bean 写显式
 * lazyInit=false,Boot 惰化只作用于无显式标记的定义;A/B 中位反而 +86ms——成本从端口绑定
 * 搬进首个 heartbeat)。下一步的正确形态是「定点」:找出 top 慢 bean,在 XML 里对个别重
 * bean 显式 lazy-init="true"。本处理器就是那份数据的来源。
 *
 * 语义:postProcessBefore/AfterInitialization 括住 init 段(aware 回调 + @PostConstruct +
 * afterPropertiesSet);嵌套依赖的窗口互相包含(A 依赖 B 时 A 的耗时含 B)——作 top-N 热点
 * 榜足够,读数时知晓此口径即可。ready 后输出 top-40 至 stderr(进 java.log)+ 单行账本
 * (HOROSA_LEDGER_FILE,seg=java.bean_top)。关闭时(默认)两个钩子均为无分支直返,零开销。
 */
@Component
public class BeanTimingPostProcessor implements BeanPostProcessor, ApplicationListener<ApplicationReadyEvent>, PriorityOrdered {

    private static final boolean ENABLED = "1".equals(System.getenv("HOROSA_BEAN_TIMING"));

    private final Map<String, Long> startNs = new ConcurrentHashMap<>(512);
    private final Map<String, Long> costNs = new ConcurrentHashMap<>(512);

    @Override
    public int getOrder() {
        return PriorityOrdered.HIGHEST_PRECEDENCE;
    }

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) {
        if (ENABLED) {
            startNs.put(beanName, System.nanoTime());
        }
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        if (ENABLED) {
            Long t0 = startNs.remove(beanName);
            if (t0 != null) {
                costNs.put(beanName, System.nanoTime() - t0);
            }
        }
        return bean;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        if (!ENABLED || costNs.isEmpty()) {
            return;
        }
        try {
            List<Map.Entry<String, Long>> top = costNs.entrySet().stream()
                    .sorted(Comparator.<Map.Entry<String, Long>>comparingLong(Map.Entry::getValue).reversed())
                    .limit(40)
                    .collect(Collectors.toList());
            StringBuilder sb = new StringBuilder("HOROSA_BEAN_TIMING top40 (init-phase ms, nested windows overlap):\n");
            StringBuilder json = new StringBuilder("[");
            boolean first = true;
            for (Map.Entry<String, Long> e : top) {
                double ms = e.getValue() / 1_000_000.0;
                sb.append(String.format("  %8.1f ms  %s%n", ms, e.getKey()));
                if (!first) {
                    json.append(',');
                }
                json.append(String.format("{\"b\":\"%s\",\"ms\":%.1f}", e.getKey().replace("\"", ""), ms));
                first = false;
            }
            json.append(']');
            System.err.println(sb);
            String ledgerFile = System.getenv("HOROSA_LEDGER_FILE");
            if (ledgerFile != null && !ledgerFile.isEmpty()) {
                long pid = ManagementFactory.getRuntimeMXBean().getPid();
                String runTag = System.getenv("HOROSA_RUN_TAG");
                String row = String.format(
                        "{\"run\":\"%s\",\"layer\":\"java\",\"seg\":\"java.bean_top\",\"pid\":%d,\"extra\":%s}%n",
                        runTag == null ? "" : runTag.replace("\"", ""), pid, json);
                Files.write(Paths.get(ledgerFile), row.getBytes(StandardCharsets.UTF_8),
                        StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            }
        } catch (Throwable ignore) {
            // 观测 best-effort:任何异常吞掉,绝不影响启动。
        }
    }
}
