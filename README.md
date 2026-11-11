# Spaceship Domain Score

Spaceship 域名搜索页的 Chrome 插件。结果里的域名加载后会批量请求评分，并把分数标在价格旁边。

- 低于 40：红色
- 40–70：黄色
- 高于 70：绿色
- 悬停分数可看品牌适配度、市场需求、易记性

支持 `https://www.spaceship.com/domain-search`，以及 `/zh/domain-search`、`/de/domain-search` 这类语言路径，包含生成器等子页面。

## 安装

1. 打开 `chrome://extensions`
2. 打开右上角「开发者模式」
3. 选择「加载已解压的扩展程序」
4. 选中这个目录
5. 刷新已经打开的 Spaceship 搜索页

评分请求走页面自己的会话，不需要额外的 API key。
