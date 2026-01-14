# CDM-17-cc - 源码目录结构分析

**日期：** 2026-01-14

## 概览
该仓库是一个 pnpm + Turborepo 的 TypeScript monorepo，核心运行单元是 `apps/web`（Next.js）与 `apps/api`（NestJS），并通过 `packages/*` 共享类型/UI/数据库等能力。

## 完整目录结构（截断到 3 层深度）
```
CDM-17-ALL/
├── .claude/
│   ├── audio/
│   │   ├── tracks/
│   │   │   ├── agent_vibes_arabic_v2_loop.mp3
│   │   │   ├── agent_vibes_bachata_v1_loop.mp3
│   │   │   ├── agent_vibes_bossa_nova_v2_loop.mp3
│   │   │   ├── agent_vibes_celtic_harp_v1_loop.mp3
│   │   │   ├── agent_vibes_chillwave_v2_loop.mp3
│   │   │   ├── agent_vibes_cumbia_v1_loop.mp3
│   │   │   ├── agent_vibes_dark_chill_step_loop.mp3
│   │   │   ├── agent_vibes_ganawa_ambient_v2_loop.mp3
│   │   │   ├── agent_vibes_goa_trance_v2_loop.mp3
│   │   │   ├── agent_vibes_harpsichord_v2_loop.mp3
│   │   │   ├── agent_vibes_hawaiian_slack_key_guitar_v2_loop.mp3
│   │   │   ├── agent_vibes_japanese_city_pop_v1_loop.mp3
│   │   │   ├── agent_vibes_salsa_v2_loop.mp3
│   │   │   ├── agent_vibes_tabla_dream_pop_v1_loop.mp3
│   │   │   ├── agentvibes_soft_flamenco_loop.mp3
│   │   │   └── dreamy_house_loop.mp3
│   │   ├── tts-padded-1766189035.aiff
│   │   ├── tts-padded-1766189076.aiff
│   │   ├── tts-padded-1766289166.aiff
│   │   ├── tts-padded-1766289214.aiff
│   │   ├── tts-padded-1766289231.aiff
│   │   ├── tts-padded-1766289269.aiff
│   │   ├── tts-padded-1766289543.aiff
│   │   ├── tts-padded-1766290332.aiff
│   │   ├── tts-padded-1766291111.aiff
│   │   ├── tts-padded-1766293453.aiff
│   │   ├── tts-padded-1766293803.aiff
│   │   ├── tts-padded-1766293917.aiff
│   │   ├── tts-padded-1766294024.aiff
│   │   ├── tts-padded-1766294102.aiff
│   │   ├── tts-padded-1766294186.aiff
│   │   ├── tts-padded-1766294361.aiff
│   │   ├── tts-padded-1766294462.aiff
│   │   ├── tts-padded-1766294557.aiff
│   │   ├── tts-padded-1766298011.aiff
│   │   ├── tts-padded-1766298049.aiff
│   │   ├── tts-padded-1766298149.aiff
│   │   ├── tts-padded-1766298550.aiff
│   │   ├── tts-padded-1766298599.aiff
│   │   ├── tts-padded-1766298708.aiff
│   │   ├── tts-padded-1766298787.aiff
│   │   ├── tts-padded-1766298868.aiff
│   │   ├── tts-padded-1766299115.aiff
│   │   ├── tts-padded-1766299193.aiff
│   │   ├── tts-padded-1766299476.aiff
│   │   ├── tts-padded-1766299578.aiff
│   │   ├── tts-padded-1766299769.aiff
│   │   ├── tts-padded-1766299887.aiff
│   │   ├── tts-padded-1766300100.aiff
│   │   ├── tts-padded-1766300175.aiff
│   │   ├── tts-padded-1766300242.aiff
│   │   ├── tts-padded-1766300407.aiff
│   │   ├── tts-padded-1766300714.aiff
│   │   ├── tts-padded-1766301008.aiff
│   │   ├── tts-padded-1766301159.aiff
│   │   ├── tts-padded-1766335683.aiff
│   │   ├── tts-padded-1766335794.aiff
│   │   ├── tts-padded-1766336272.aiff
│   │   ├── tts-padded-1766336473.aiff
│   │   ├── tts-padded-1766336828.aiff
│   │   ├── tts-padded-1766336937.aiff
│   │   ├── tts-padded-1766337032.aiff
│   │   ├── tts-padded-1766337273.aiff
│   │   ├── tts-padded-1766337402.aiff
│   │   ├── tts-padded-1766337464.aiff
│   │   ├── tts-padded-1766337658.aiff
│   │   ├── tts-padded-1766337751.aiff
│   │   ├── tts-padded-1766337961.aiff
│   │   ├── tts-padded-1766338687.aiff
│   │   ├── tts-padded-1766338793.aiff
│   │   ├── tts-padded-1766339151.aiff
│   │   ├── tts-padded-1766339378.aiff
│   │   ├── tts-padded-1766339464.aiff
│   │   ├── tts-padded-1766339771.aiff
│   │   ├── tts-padded-1766339850.aiff
│   │   ├── tts-padded-1766340006.aiff
│   │   ├── tts-padded-1766340100.aiff
│   │   ├── tts-padded-1766340264.aiff
│   │   ├── tts-padded-1766340640.aiff
│   │   ├── tts-padded-1766340782.aiff
│   │   ├── tts-padded-1766341203.aiff
│   │   ├── tts-padded-1766341275.aiff
│   │   ├── tts-padded-1766341586.aiff
│   │   ├── tts-padded-1766341659.aiff
│   │   ├── tts-padded-1766342058.aiff
│   │   ├── tts-padded-1766342196.aiff
│   │   ├── tts-padded-1766342297.aiff
│   │   ├── tts-padded-1766342346.aiff
│   │   ├── tts-padded-1766342431.aiff
│   │   ├── tts-padded-1766342546.aiff
│   │   ├── tts-padded-1766342651.aiff
│   │   ├── tts-padded-1766342845.aiff
│   │   ├── tts-padded-1767230705.aiff
│   │   ├── tts-padded-1767231866.aiff
│   │   ├── tts-padded-1767232318.aiff
│   │   ├── tts-padded-1767242419.aiff
│   │   ├── tts-padded-1767242886.aiff
│   │   ├── tts-padded-1767246196.aiff
│   │   ├── tts-padded-1767246226.aiff
│   │   ├── tts-padded-1767249132.aiff
│   │   ├── tts-padded-1767249153.aiff
│   │   ├── tts-padded-1767253071.aiff
│   │   ├── tts-padded-1767262982.aiff
│   │   ├── tts-padded-1767263023.aiff
│   │   ├── tts-padded-1767263096.aiff
│   │   ├── tts-padded-1767263374.aiff
│   │   ├── tts-padded-1767265993.aiff
│   │   ├── tts-padded-1767266016.aiff
│   │   ├── tts-padded-1767270791.aiff
│   │   ├── tts-padded-1767271753.aiff
│   │   ├── tts-padded-1767272547.aiff
│   │   ├── tts-padded-1767317572.aiff
│   │   ├── tts-padded-1767317781.aiff
│   │   ├── tts-padded-1767321133.aiff
│   │   ├── tts-padded-1767321165.aiff
│   │   ├── tts-padded-1767326535.aiff
│   │   ├── tts-padded-1767327085.aiff
│   │   ├── tts-padded-1767327171.aiff
│   │   ├── tts-padded-1767327718.aiff
│   │   ├── tts-padded-1767328240.aiff
│   │   ├── tts-padded-1767445161.aiff
│   │   ├── tts-padded-1767445211.aiff
│   │   ├── tts-padded-1767445552.aiff
│   │   ├── tts-padded-1767445577.aiff
│   │   ├── tts-padded-1767447315.aiff
│   │   ├── tts-padded-1767447342.aiff
│   │   ├── tts-padded-1767488724.aiff
│   │   ├── tts-padded-1767488949.aiff
│   │   ├── tts-padded-1767489068.aiff
│   │   ├── tts-padded-1767489372.aiff
│   │   ├── tts-padded-1767489562.aiff
│   │   ├── tts-padded-1767489613.aiff
│   │   ├── tts-padded-1767489657.aiff
│   │   ├── tts-padded-1768012310.aiff
│   │   ├── tts-padded-1768012324.aiff
│   │   ├── tts-padded-1768026239.aiff
│   │   ├── tts-padded-1768026284.aiff
│   │   ├── tts-padded-1768026884.aiff
│   │   ├── tts-padded-1768027301.aiff
│   │   ├── tts-padded-1768027696.aiff
│   │   ├── tts-padded-1768027872.aiff
│   │   ├── tts-padded-1768027891.aiff
│   │   ├── tts-padded-1768035817.aiff
│   │   ├── tts-padded-1768035849.aiff
│   │   ├── tts-padded-1768035931.aiff
│   │   ├── tts-padded-1768036024.aiff
│   │   ├── tts-padded-1768036187.aiff
│   │   ├── tts-padded-1768036499.aiff
│   │   ├── tts-padded-1768037287.aiff
│   │   ├── tts-padded-1768057310.aiff
│   │   ├── tts-padded-1768057389.aiff
│   │   ├── tts-padded-1768057490.aiff
│   │   ├── tts-padded-1768094884.aiff
│   │   ├── tts-padded-1768094904.aiff
│   │   ├── tts-padded-1768096394.aiff
│   │   ├── tts-padded-1768096512.aiff
│   │   ├── tts-padded-1768096709.aiff
│   │   ├── tts-padded-1768096756.aiff
│   │   ├── tts-padded-1768096836.aiff
│   │   ├── tts-padded-1768097123.aiff
│   │   ├── tts-padded-1768097993.aiff
│   │   ├── tts-padded-1768098081.aiff
│   │   ├── tts-padded-1768098172.aiff
│   │   ├── tts-padded-1768098392.aiff
│   │   ├── tts-padded-1768098480.aiff
│   │   ├── tts-padded-1768098595.aiff
│   │   ├── tts-padded-1768098881.aiff
│   │   ├── tts-padded-1768098904.aiff
│   │   ├── tts-padded-1768098928.aiff
│   │   ├── tts-padded-1768099060.aiff
│   │   ├── tts-padded-1768099161.aiff
│   │   ├── tts-padded-1768099200.aiff
│   │   ├── tts-padded-1768099297.aiff
│   │   ├── tts-padded-1768099408.aiff
│   │   ├── tts-padded-1768099543.aiff
│   │   ├── tts-padded-1768099707.aiff
│   │   ├── tts-padded-1768099930.aiff
│   │   ├── tts-padded-1768099984.aiff
│   │   ├── tts-padded-1768100099.aiff
│   │   ├── tts-padded-1768100203.aiff
│   │   ├── tts-padded-1768100387.aiff
│   │   ├── tts-padded-1768100691.aiff
│   │   ├── tts-padded-1768100712.aiff
│   │   ├── tts-padded-1768101778.aiff
│   │   ├── tts-padded-1768101809.aiff
│   │   ├── tts-padded-1768101898.aiff
│   │   ├── tts-padded-1768101922.aiff
│   │   ├── tts-padded-1768107294.aiff
│   │   ├── tts-padded-1768107359.aiff
│   │   ├── tts-padded-1768107404.aiff
│   │   ├── tts-padded-1768107966.aiff
│   │   ├── tts-padded-1768108146.aiff
│   │   ├── tts-padded-1768114650.aiff
│   │   └── tts-padded-1768114827.aiff
│   ├── commands/
│   │   ├── agent-vibes/
│   │   │   ├── add.md
│   │   │   ├── agent-vibes.md
│   │   │   ├── agent.md
│   │   │   ├── background-music.md
│   │   │   ├── bmad.md
│   │   │   ├── commands.json
│   │   │   ├── effects.md
│   │   │   ├── get.md
│   │   │   ├── hide.md
│   │   │   ├── language.md
│   │   │   ├── learn.md
│   │   │   ├── list.md
│   │   │   ├── mute.md
│   │   │   ├── personality.md
│   │   │   ├── preview.md
│   │   │   ├── provider.md
│   │   │   ├── replay-target.md
│   │   │   ├── replay.md
│   │   │   ├── sample.md
│   │   │   ├── sentiment.md
│   │   │   ├── set-favorite-voice.md
│   │   │   ├── set-language.md
│   │   │   ├── set-pretext.md
│   │   │   ├── set-speed.md
│   │   │   ├── show.md
│   │   │   ├── switch.md
│   │   │   ├── target-voice.md
│   │   │   ├── target.md
│   │   │   ├── translate.md
│   │   │   ├── unmute.md
│   │   │   ├── update.md
│   │   │   ├── verbosity.md
│   │   │   ├── version.md
│   │   │   └── whoami.md
│   │   └── bmad/
│   │       ├── bmb/
│   │       ├── bmm/
│   │       └── core/
│   ├── config/
│   │   ├── audio-effects.cfg
│   │   ├── audio-effects.cfg.sample
│   │   ├── background-music-enabled.txt
│   │   ├── background-music-position.txt
│   │   ├── background-music-volume.txt
│   │   ├── background-music.cfg
│   │   └── tts-verbosity.txt
│   ├── hooks/
│   │   ├── audio-processor.sh
│   │   ├── background-music-manager.sh
│   │   ├── bmad-party-manager.sh
│   │   ├── bmad-speak-enhanced.sh
│   │   ├── bmad-speak.sh
│   │   ├── bmad-tts-injector.sh
│   │   ├── bmad-voice-manager.sh
│   │   ├── configure-rdp-mode.sh
│   │   ├── download-extra-voices.sh
│   │   ├── effects-manager.sh
│   │   ├── github-star-reminder.sh
│   │   ├── language-manager.sh
│   │   ├── learn-manager.sh
│   │   ├── macos-voice-manager.sh
│   │   ├── migrate-background-music.sh
│   │   ├── migrate-to-agentvibes.sh
│   │   ├── optimize-background-music.sh
│   │   ├── personality-manager.sh
│   │   ├── piper-download-voices.sh
│   │   ├── piper-installer.sh
│   │   ├── piper-multispeaker-registry.sh
│   │   ├── piper-voice-manager.sh
│   │   ├── play-tts-enhanced.sh
│   │   ├── play-tts-macos.sh
│   │   ├── play-tts-piper.sh
│   │   ├── play-tts.sh
│   │   ├── provider-commands.sh
│   │   ├── provider-manager.sh
│   │   ├── replay-target-audio.sh
│   │   ├── sentiment-manager.sh
│   │   ├── session-start-tts.sh
│   │   ├── speed-manager.sh
│   │   ├── translate-manager.sh
│   │   ├── tts-queue-worker.sh
│   │   ├── tts-queue.sh
│   │   ├── verbosity-manager.sh
│   │   └── voice-manager.sh
│   ├── personalities/
│   │   ├── angry.md
│   │   ├── annoying.md
│   │   ├── crass.md
│   │   ├── dramatic.md
│   │   ├── dry-humor.md
│   │   ├── flirty.md
│   │   ├── funny.md
│   │   ├── grandpa.md
│   │   ├── millennial.md
│   │   ├── moody.md
│   │   ├── normal.md
│   │   ├── pirate.md
│   │   ├── poetic.md
│   │   ├── professional.md
│   │   ├── rapper.md
│   │   ├── robot.md
│   │   ├── sarcastic.md
│   │   ├── sassy.md
│   │   ├── surfer-dude.md
│   │   └── zen.md
│   ├── activation-instructions
│   ├── piper-voices-dir.txt
│   ├── settings.json
│   ├── settings.local.json
│   ├── tts-provider.txt
│   ├── tts-verbosity.txt
│   └── tts-voice.txt
├── _bmad/
│   ├── _config/
│   │   ├── agents/
│   │   │   ├── bmb-bmad-builder.customize.yaml
│   │   │   ├── bmm-analyst.customize.yaml
│   │   │   ├── bmm-architect.customize.yaml
│   │   │   ├── bmm-dev.customize.yaml
│   │   │   ├── bmm-pm.customize.yaml
│   │   │   ├── bmm-quick-flow-solo-dev.customize.yaml
│   │   │   ├── bmm-sm.customize.yaml
│   │   │   ├── bmm-tea.customize.yaml
│   │   │   ├── bmm-tech-writer.customize.yaml
│   │   │   ├── bmm-ux-designer.customize.yaml
│   │   │   └── core-bmad-master.customize.yaml
│   │   ├── custom/
│   │   ├── ides/
│   │   │   ├── claude-code.yaml
│   │   │   └── codex.yaml
│   │   ├── agent-manifest.csv
│   │   ├── agent-voice-map.csv
│   │   ├── files-manifest.csv
│   │   ├── manifest.yaml
│   │   ├── task-manifest.csv
│   │   ├── tool-manifest.csv
│   │   └── workflow-manifest.csv
│   ├── bmb/
│   │   ├── agents/
│   │   │   └── bmad-builder.md
│   │   ├── docs/
│   │   │   ├── agents/
│   │   │   ├── workflows/
│   │   │   └── README.md
│   │   ├── reference/
│   │   │   ├── agents/
│   │   │   ├── workflows/
│   │   │   └── README.md
│   │   ├── workflows/
│   │   │   ├── create-agent/
│   │   │   ├── create-module/
│   │   │   ├── create-workflow/
│   │   │   ├── edit-agent/
│   │   │   ├── edit-workflow/
│   │   │   └── workflow-compliance-check/
│   │   ├── workflows-legacy/
│   │   │   ├── edit-module/
│   │   │   └── module-brief/
│   │   └── config.yaml
│   ├── bmm/
│   │   ├── agents/
│   │   │   ├── analyst.md
│   │   │   ├── architect.md
│   │   │   ├── dev.md
│   │   │   ├── pm.md
│   │   │   ├── quick-flow-solo-dev.md
│   │   │   ├── sm.md
│   │   │   ├── tea.md
│   │   │   ├── tech-writer.md
│   │   │   └── ux-designer.md
│   │   ├── data/
│   │   │   ├── documentation-standards.md
│   │   │   ├── project-context-template.md
│   │   │   └── README.md
│   │   ├── docs/
│   │   │   ├── images/
│   │   │   ├── agents-guide.md
│   │   │   ├── bmad-quick-flow.md
│   │   │   ├── brownfield-guide.md
│   │   │   ├── enterprise-agentic-development.md
│   │   │   ├── faq.md
│   │   │   ├── glossary.md
│   │   │   ├── party-mode.md
│   │   │   ├── quick-flow-solo-dev.md
│   │   │   ├── quick-spec-flow.md
│   │   │   ├── quick-start.md
│   │   │   ├── README.md
│   │   │   ├── scale-adaptive-system.md
│   │   │   ├── test-architecture.md
│   │   │   ├── troubleshooting.md
│   │   │   ├── workflow-architecture-reference.md
│   │   │   ├── workflow-document-project-reference.md
│   │   │   ├── workflows-analysis.md
│   │   │   ├── workflows-implementation.md
│   │   │   ├── workflows-planning.md
│   │   │   └── workflows-solutioning.md
│   │   ├── teams/
│   │   │   ├── default-party.csv
│   │   │   └── team-fullstack.yaml
│   │   ├── testarch/
│   │   │   ├── knowledge/
│   │   │   └── tea-index.csv
│   │   ├── workflows/
│   │   │   ├── 1-analysis/
│   │   │   ├── 2-plan-workflows/
│   │   │   ├── 3-solutioning/
│   │   │   ├── 4-implementation/
│   │   │   ├── bmad-quick-flow/
│   │   │   ├── document-project/
│   │   │   ├── excalidraw-diagrams/
│   │   │   ├── generate-project-context/
│   │   │   ├── testarch/
│   │   │   └── workflow-status/
│   │   ├── config.yaml
│   │   └── README.md
│   ├── core/
│   │   ├── agents/
│   │   │   ├── bmad-master.md
│   │   │   └── bmad-web-orchestrator.agent.xml
│   │   ├── resources/
│   │   │   └── excalidraw/
│   │   ├── tasks/
│   │   │   ├── advanced-elicitation-methods.csv
│   │   │   ├── advanced-elicitation.xml
│   │   │   ├── index-docs.xml
│   │   │   ├── validate-workflow.xml
│   │   │   └── workflow.xml
│   │   ├── tools/
│   │   │   └── shard-doc.xml
│   │   ├── workflows/
│   │   │   ├── brainstorming/
│   │   │   └── party-mode/
│   │   ├── config.yaml
│   │   └── module.yaml
│   └── docs/
│       ├── claude-code-instructions.md
│       └── codex-instructions.md
├── apps/
│   ├── api/
│   │   ├── scripts/
│   │   │   ├── create-story-9-data.ts
│   │   │   ├── generate-story-9-assets.ts
│   │   │   └── generate_satellite_vtp.py
│   │   ├── src/
│   │   │   ├── demo/
│   │   │   ├── modules/
│   │   │   ├── pipes/
│   │   │   ├── app.controller.spec.ts
│   │   │   ├── app.controller.ts
│   │   │   ├── app.module.ts
│   │   │   ├── app.service.ts
│   │   │   ├── main.ts
│   │   │   └── plugin-migration.cleanup.spec.ts
│   │   ├── uploads/
│   │   │   ├── comments/
│   │   │   ├── _mz1D3wg-KinF817zllLz.png
│   │   │   ├── JGdru0szGjjVat_UAgswZ.png
│   │   │   ├── uN4zx7tsVRRrxvW_GtP8e.png
│   │   │   └── X0NStcr2UGpiCRcQflE38.png
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── clean-db.ts
│   │   ├── eslint.config.mjs
│   │   ├── jest.config.js
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsconfig.spec.json
│   └── web/
│       ├── __tests__/
│       │   ├── components/
│       │   ├── features/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── GraphComponent.test.tsx
│       │   └── setup.ts
│       ├── app/
│       │   ├── api/
│       │   ├── graph/
│       │   ├── graphs/
│       │   ├── poc/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── providers.tsx
│       ├── components/
│       │   ├── App/
│       │   ├── ArchiveBox/
│       │   ├── collab/
│       │   ├── CommandPalette/
│       │   ├── Comments/
│       │   ├── graph/
│       │   ├── KeyboardShortcutsGuide/
│       │   ├── Knowledge/
│       │   ├── layout/
│       │   ├── nodes/
│       │   ├── notifications/
│       │   ├── performance/
│       │   ├── ProductLibrary/
│       │   ├── PropertyPanel/
│       │   ├── TemplateLibrary/
│       │   ├── toolbar/
│       │   └── UserSelector/
│       ├── config/
│       │   └── keyboard-shortcuts.ts
│       ├── contexts/
│       │   ├── AppLibraryContext.tsx
│       │   ├── CollaborationUIContext.tsx
│       │   ├── CommentCountContext.tsx
│       │   ├── GraphContext.tsx
│       │   ├── index.ts
│       │   └── UserContext.tsx
│       ├── e2e/
│       │   ├── fixtures/
│       │   ├── app-node.spec.ts
│       │   ├── arrow_key_navigation.spec.ts
│       │   ├── clipboard-data-sanitization.spec.ts
│       │   ├── clipboard-operations.spec.ts
│       │   ├── collaboration.spec.ts
│       │   ├── context-menu-selection.spec.ts
│       │   ├── data-library-views.spec.ts
│       │   ├── data-library.spec.ts
│       │   ├── data-upload-node-linking.spec.ts
│       │   ├── dependency-mode.spec.ts
│       │   ├── drill-down.spec.ts
│       │   ├── edit_mode.spec.ts
│       │   ├── enter_key_creates_sibling.spec.ts
│       │   ├── knowledge-mock.spec.ts
│       │   ├── layout-switching.spec.ts
│       │   ├── minimap.spec.ts
│       │   ├── model-viewer.spec.ts
│       │   ├── multi-view-synchronization.spec.ts
│       │   ├── node-collapse.spec.ts
│       │   ├── node-order.spec.ts
│       │   ├── node-type-conversion.spec.ts
│       │   ├── notification-center.spec.ts
│       │   ├── outline-view.spec.ts
│       │   ├── pbs-enhancement.spec.ts
│       │   ├── permanent-delete.spec.ts
│       │   ├── property-panel-binding.spec.ts
│       │   ├── semantic-zoom-lod.spec.ts
│       │   ├── tab_key_creates_child.spec.ts
│       │   ├── template-library.spec.ts
│       │   ├── testUtils.ts
│       │   ├── toolbar-redesign.spec.ts
│       │   ├── watch_subscription.spec.ts
│       │   └── zoom-shortcuts.spec.ts
│       ├── features/
│       │   ├── collab/
│       │   ├── data-library/
│       │   ├── industrial-viewer/
│       │   └── views/
│       ├── hooks/
│       │   ├── __tests__/
│       │   ├── clipboard/
│       │   ├── right-sidebar/
│       │   ├── useAppLibrary.ts
│       │   ├── useApproval.ts
│       │   ├── useApprovalConfig.ts
│       │   ├── useArchive.ts
│       │   ├── useAttachmentUpload.ts
│       │   ├── useClipboard.ts
│       │   ├── useClipboardShortcuts.ts
│       │   ├── useCollaboration.ts
│       │   ├── useCommentActions.ts
│       │   ├── useCommentCount.ts
│       │   ├── useComments.ts
│       │   ├── useDependencyMode.ts
│       │   ├── useEditingState.ts
│       │   ├── useGlobalShortcut.ts
│       │   ├── useGraph.ts
│       │   ├── useGraphs.ts
│       │   ├── useKnowledge.ts
│       │   ├── useLayoutPlugin.ts
│       │   ├── useMediaQuery.ts
│       │   ├── useMindmapPlugin.ts
│       │   ├── useMinimapStorage.ts
│       │   ├── useNotifications.ts
│       │   ├── useProductSearch.ts
│       │   ├── useSearch.ts
│       │   ├── useSelection.ts
│       │   ├── useSubscription.ts
│       │   ├── useTaskDispatch.ts
│       │   ├── useTemplateInsert.ts
│       │   ├── useTemplates.ts
│       │   └── useUserSearch.ts
│       ├── lib/
│       │   ├── __tests__/
│       │   ├── api/
│       │   ├── commentCountStore.ts
│       │   ├── constants.ts
│       │   ├── drillDownStore.ts
│       │   ├── edgeRouting.ts
│       │   ├── edgeRoutingConstants.ts
│       │   ├── edgeShapes.ts
│       │   ├── edgeStyles.ts
│       │   ├── edgeValidation.ts
│       │   ├── logger.ts
│       │   ├── productLibrary.ts
│       │   ├── semanticZoomLOD.ts
│       │   ├── subscriptionStore.ts
│       │   └── subtree-extractor.ts
│       ├── public/
│       │   ├── libs/
│       │   ├── mock/
│       │   └── thumbnails/
│       ├── types/
│       │   ├── online-3d-viewer.d.ts
│       │   └── vtk.d.ts
│       ├── eslint.config.mjs
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package.json
│       ├── playwright.config.ts
│       ├── postcss.config.mjs
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── tsconfig.tsbuildinfo
│       ├── vitest-web.json
│       └── vitest.config.ts
├── bmad-custom-src/
│   └── custom.yaml
├── docs/
│   ├── analysis/
│   │   ├── archive-confirm-ui-refactor.md
│   │   ├── archive-drawer-empty-list-debug.md
│   │   ├── archive-drawer-list-fix-report.md
│   │   ├── archive-drawer-no-data-root-cause.md
│   │   ├── archive-restore-sync-fix.md
│   │   ├── confirm-dialog-implementation.md
│   │   ├── dynamic-graph-id-impact-analysis.md
│   │   ├── dynamic-graph-id-implementation-plan.md
│   │   ├── refactoring-proposal-2025-12-28.md
│   │   ├── story-9-2-refactoring-conflict-analysis.md
│   │   ├── tag-search-display-fix.md
│   │   ├── tags-archive-sync-fix.md
│   │   └── test-suite-alignment-fix-2025-12-28.md
│   ├── plans/
│   │   ├── archive-drawer-renovation.md
│   │   ├── data-library-node-tab-merge-prd.md
│   │   ├── permanent-delete-design.md
│   │   ├── story-9-10-property-panel-asset-binding.md
│   │   ├── story-9-9-toolbar-redesign-prd.md
│   │   └── vertical-tree-layout.md
│   ├── prototypes/
│   │   ├── archive/
│   │   │   ├── active_users_avatar_stack.png
│   │   │   ├── collab_cursors_mockup.png
│   │   │   ├── collaboration_scenario.png
│   │   │   ├── competitor_comparison.png
│   │   │   ├── cycle_detection_error.png
│   │   │   ├── dependency_connection_flow.png
│   │   │   ├── gantt_view_mockup.png
│   │   │   ├── kanban_view_mockup.png
│   │   │   ├── mindmap_interface.png
│   │   │   ├── product_architecture.png
│   │   │   ├── prototype_layout_mode_switcher.png
│   │   │   └── security_features.png
│   │   ├── common/
│   │   │   ├── approval-panel-ui.png
│   │   │   ├── pbs_node_ui.png
│   │   │   ├── rich-node-design-ref.png
│   │   │   └── rich-node-ui-variants.png
│   │   ├── story-1-2/
│   │   │   ├── story_1_2_existing_ui.svg
│   │   │   ├── story_1_2_prototype.svg
│   │   │   └── story_1_2_types_states.svg
│   │   ├── story-2-5/
│   │   │   ├── archive_drawer_mockup.png
│   │   │   ├── node_tags_display.png
│   │   │   ├── search_dialog_mockup.png
│   │   │   └── tag_editor_component.png
│   │   ├── story-5-2/
│   │   │   ├── 5-2-node-context-menu.png
│   │   │   ├── 5-2-save-template-dialog.png
│   │   │   └── 5-2-template-library-drag.png
│   │   ├── story-8-1/
│   │   │   ├── child-count-badge-spec.png
│   │   │   ├── collapse-toggle-spec.png
│   │   │   ├── interaction-flow.png
│   │   │   ├── node-collapsed.png
│   │   │   └── node-expanded.png
│   │   ├── story-8-2/
│   │   │   ├── minimap-expanded-state.png
│   │   │   ├── minimap-interaction-flow.png
│   │   │   ├── minimap-node-highlights.png
│   │   │   └── minimap-toggle-button.png
│   │   ├── story-8-3/
│   │   │   ├── canvas-with-zoom-ui.png
│   │   │   ├── double-click-center-flow.png
│   │   │   ├── keyboard-shortcuts-overview.png
│   │   │   └── zoom-indicator-states.png
│   │   ├── story-8-4/
│   │   │   ├── story-8-4-outline-default.png
│   │   │   ├── story-8-4-outline-dragging.png
│   │   │   └── story-8-4-sidebar-full.png
│   │   ├── story-8-8/
│   │   │   └── semantic-zoom-lod-prototype.png
│   │   ├── story-8-9/
│   │   │   └── subgraph-drill-down-ui.png
│   │   ├── story-9-2/
│   │   │   ├── drag-drop-feedback.png
│   │   │   ├── empty-state.png
│   │   │   ├── folder-view.png
│   │   │   ├── pbs-view.png
│   │   │   └── task-view.png
│   │   ├── story-9-7/
│   │   │   ├── context-upload-states.png
│   │   │   ├── grouped-asset-panel.png
│   │   │   ├── quick-type-picker.png
│   │   │   ├── unselected-node-prompt.png
│   │   │   └── upload-type-dropdown.png
│   │   ├── story-9-8/
│   │   │   ├── story_9_8_breadcrumb_1768283153650.png
│   │   │   ├── story_9_8_dual_search_1768283259683.png
│   │   │   ├── story_9_8_main_view_1768283106039.png
│   │   │   ├── story_9_8_multiselect_1768283177202.png
│   │   │   ├── story_9_8_provenance_1768283203842.png
│   │   │   ├── story_9_8_tab_migration_1768283310783.png
│   │   │   └── story_9_8_unlink_toast_1768283282480.png
│   │   ├── story-9-9/
│   │   │   ├── current_toolbar_screenshot.png
│   │   │   ├── filter_state_behavior.png
│   │   │   ├── full_layout_mockup.png
│   │   │   ├── scope_selector_dropdown.png
│   │   │   ├── toolbar_before_after.png
│   │   │   └── toolbar_redesign_v2.png
│   │   ├── binding_mode_ui_mockup.png
│   │   ├── model_viewer_loading_error_states_1768040126898.png
│   │   ├── model_viewer_preview_main_1768040102253.png
│   │   ├── README.md
│   │   └── story-9-5-ui-design.png
│   ├── sprint-artifacts/
│   │   ├── 1-1-environment-init-basic-canvas.md
│   │   ├── 1-2-node-operations-shortcuts.md
│   │   ├── 1-3-advanced-layout-control.md
│   │   ├── 1-4-real-time-collaboration-engine.md
│   │   ├── 2-1-task-conversion-properties.md
│   │   ├── 2-2-task-dependency-network.md
│   │   ├── 2-3-detailed-design.md
│   │   ├── 2-3-multi-view-synchronization-tech-spec.md
│   │   ├── 2-3-multi-view-synchronization.md
│   │   ├── 2-4-task-dispatch-feedback.md
│   │   ├── 2-5-data-organization-search.md
│   │   ├── 2-6-multi-select-clipboard.md
│   │   ├── 2-7-pbs-node-enhancement.md
│   │   ├── 2-8-knowledge-link-recommendation-mock.md
│   │   ├── 2-9-app-node-type.md
│   │   ├── 2-9-tech-spec.md
│   │   ├── 3-5-performance-optimization.md
│   │   ├── 3-6-infrastructure-lint-fix.md
│   │   ├── 4-1-approval-driven-workflow.md
│   │   ├── 4-3-contextual-comments-and-mentions.md
│   │   ├── 4-4-watch-subscription.md
│   │   ├── 4-5-smart-notification-center.md
│   │   ├── 5-1-template-library.md
│   │   ├── 5-2-subtree-fragments.md
│   │   ├── 9-1-data-library-drawer.md
│   │   ├── 9-10-property-panel-asset-binding.md
│   │   ├── 9-2-multi-dimensional-organization.md
│   │   ├── 9-3-lightweight-viewer-step-gltf.md
│   │   ├── 9-4-lightweight-viewer-mesh-contour.md
│   │   ├── 9-5-data-upload-node-linking.md
│   │   ├── 9-7-context-aware-data-asset-interaction.md
│   │   ├── 9-8-node-view-merge.md
│   │   ├── 9-9-toolbar-redesign.md
│   │   ├── code_review_findings_8_6.md
│   │   ├── contour_viewer_mockup.png
│   │   ├── epic-1-retrospective.md
│   │   ├── epic-2-retro-2025-12-23.md
│   │   ├── review-report-1-1.md
│   │   ├── sprint-status.yaml
│   │   ├── story-7-1-backend-repo-refactor.md
│   │   ├── story-7-2-frontend-hook-first-extraction.md
│   │   ├── story-7-3-ui-atomic-components.md
│   │   ├── story-7-4-god-class-splitting.md
│   │   ├── story-7-5-plugin-migration.md
│   │   ├── story-7-7-product-search-dialog-refactor.md
│   │   ├── story-7-8-right-sidebar-refactor.md
│   │   ├── story-7-8-test-plan.md
│   │   ├── story-7-9-approval-status-panel-refactor.md
│   │   ├── story-7-9-test-plan.md
│   │   ├── story-7-9-uat.md
│   │   ├── story-8-1-node-collapse-expand.md
│   │   ├── story-8-2-minimap-navigation.md
│   │   ├── story-8-3-zoom-shortcuts-system.md
│   │   ├── story-8-4-outline-view.md
│   │   ├── story-8-5-focus-mode.md
│   │   ├── story-8-6-impact-analysis-and-test-design.md
│   │   ├── story-8-6-node-order-persistence.md
│   │   ├── story-8-8-semantic-zoom-lod.md
│   │   ├── story-8-9-impact-analysis.md
│   │   ├── story-8-9-subgraph-drill-down.md
│   │   ├── tech-spec-5-1-template-library.md
│   │   ├── tech-spec-5-2-subtree-fragments.md
│   │   ├── tech-spec-8-1-node-collapse-expand.md
│   │   ├── tech-spec-8-2-minimap-navigation.md
│   │   ├── tech-spec-8-3-zoom-shortcuts-system.md
│   │   ├── tech-spec-8-4-outline-view.md
│   │   ├── tech-spec-8-5-focus-mode.md
│   │   ├── tech-spec-8-6-node-order-persistence.md
│   │   ├── tech-spec-8-8-semantic-zoom-lod.md
│   │   ├── tech-spec-8-9-subgraph-drill-down.md
│   │   ├── tech-spec-9-2-multi-dimensional-organization.md
│   │   ├── tech-spec-9-3-lightweight-viewer.md
│   │   ├── tech-spec-9-4-lightweight-viewer-mesh-contour.md
│   │   ├── tech-spec-9-5-data-upload-node-linking.md
│   │   ├── tech-spec-9-7-context-aware-data-asset-interaction.md
│   │   ├── tech-spec-9-8-node-view-merge.md
│   │   ├── tech-spec-approval-workflow.md
│   │   ├── tech-spec-story-7-4.md
│   │   ├── ui_design_optimization_v2.md
│   │   ├── ui_optimization_plan_v2.md
│   │   ├── validation-report-1-1-v2.md
│   │   ├── validation-report-1-1.md
│   │   ├── validation-report-1-3.md
│   │   ├── validation-report-1-5.md
│   │   ├── validation-report-2-2.md
│   │   ├── validation-report-2025-12-22T10-41-32+0800.md
│   │   ├── validation-report-2025-12-30T17-22-09+0800.md
│   │   ├── validation-report-2025-12-31T09-25-46+0800.md
│   │   ├── validation-report-2026-01-01T12-11-18+0800.md
│   │   ├── validation-report-2026-01-01T144636.md
│   │   ├── validation-report-2026-01-01T19-25-34+0800.md
│   │   ├── validation-report-2026-01-02T10-55-04+0800.md
│   │   ├── validation-report-2026-01-04T20-50-03+0800.md
│   │   ├── validation-report-2026-01-06T15-09-06+0800.md
│   │   ├── validation-report-2026-01-06T15-50-25+0800.md
│   │   ├── validation-report-2026-01-06T16-02-09+0800.md
│   │   ├── validation-report-2026-01-06T16-05-18+0800.md
│   │   ├── validation-report-2026-01-07T11-01-37+0800.md
│   │   ├── validation-report-2026-01-08T09-32-41+0800.md
│   │   ├── validation-report-2026-01-08T11-00-20+0800.md
│   │   ├── validation-report-2026-01-08T11-26-13+0800.md
│   │   ├── validation-report-2026-01-09T08-45-36+0800.md
│   │   ├── validation-report-2026-01-09T13-44-53+0800.md
│   │   ├── validation-report-2026-01-09T14-24-40+0800.md
│   │   ├── validation-report-2026-01-10T15-30-29+0800.md
│   │   ├── validation-report-2026-01-11T14-17-26+0800.md
│   │   ├── validation-report-2026-01-11T22-24-16+0800.md
│   │   ├── validation-report-2026-01-12T13-06-46+0800.md
│   │   ├── validation-report-2026-01-13T14-19-16+0800.md
│   │   ├── validation-report-2026-01-13T23-39-14+0800.md
│   │   └── validation-report-2026-01-14T10-55-28+0800.md
│   ├── api-contracts-api.md
│   ├── api-contracts-web.md
│   ├── architecture.md
│   ├── bmm-workflow-status.yaml
│   ├── data-models-api.md
│   ├── data-models-web.md
│   ├── epics.md
│   ├── feature-list.md
│   ├── implementation-readiness-report-2025-12-15.md
│   ├── prd.md
│   ├── project-brief.md
│   ├── project-context.md
│   ├── project-scan-report.json
│   ├── research-milanote.md
│   ├── test-design-system.md
│   ├── ux-design-specification.md
│   ├── whitepaper.docx
│   └── whitepaper.md
├── packages/
│   ├── config/
│   │   ├── eslint.config.mjs
│   │   ├── package.json
│   │   └── tailwind.config.ts
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── generated/
│   │   │   ├── migrations/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── scripts/
│   │   │   └── check-nodes.ts
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── Database.ts
│   │   │   ├── index.ts
│   │   │   ├── Repository.ts
│   │   │   └── types.ts
│   │   ├── eslint.config.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── plugins/
│   │   ├── plugin-comments/
│   │   │   ├── src/
│   │   │   ├── jest.config.js
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── plugin-layout/
│   │   │   ├── src/
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── vitest.config.ts
│   │   ├── plugin-mindmap-core/
│   │   │   ├── src/
│   │   │   ├── jest.config.js
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── vitest.config.ts
│   │   ├── plugin-template/
│   │   │   ├── src/
│   │   │   ├── jest.config.js
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── tsconfig.tsbuildinfo
│   │   ├── plugin-workflow-approval/
│   │   │   ├── src/
│   │   │   ├── jest.config.js
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   └── tsconfig.spec.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── Plugin.ts
│   │   │   ├── PluginManager.ts
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── types/
│   │   ├── __tests__/
│   │   │   ├── clipboard-types.test.ts
│   │   │   └── notification-types.test.ts
│   │   ├── src/
│   │   │   ├── __tests__/
│   │   │   ├── app-library.ts
│   │   │   ├── approval.ts
│   │   │   ├── clipboard-types.ts
│   │   │   ├── comment.ts
│   │   │   ├── data-library-types.ts
│   │   │   ├── edge-types.ts
│   │   │   ├── index.ts
│   │   │   ├── node-types.ts
│   │   │   ├── notification-types.ts
│   │   │   ├── search-types.ts
│   │   │   ├── subscription-types.ts
│   │   │   └── template-types.ts
│   │   ├── eslint.config.mjs
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── ui/
│       ├── src/
│       │   ├── badge.tsx
│       │   ├── button.tsx
│       │   ├── card.tsx
│       │   ├── collapse-toggle.tsx
│       │   ├── confirm-dialog.tsx
│       │   ├── globals.css
│       │   ├── index.ts
│       │   ├── input.tsx
│       │   ├── select.tsx
│       │   ├── toast.tsx
│       │   └── utils.ts
│       ├── eslint.config.mjs
│       ├── package.json
│       └── tsconfig.json
├── scripts/
│   └── reset-for-dynamic-graph.sh
├── .cursorrules
├── .env
├── .env.example
├── .gitignore
├── .mcp.json
├── AGENTS.md
├── CLAUDE.md
├── docker-compose.yml
├── nocobase-architecture-analysis.md
├── nocobase-key-takeaways-zh.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── project_features_checklist.md
├── test-approval-util.js
└── turbo.json
```

## 关键目录（Critical Directories）

### `apps/web/app`
Next.js App Router 路由与页面

- **用途：** Next.js App Router 路由与页面
- **包含：** 页面/路由（含 server/client 组件）与布局（约 8 个代码文件）
- **入口：** `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- **集成：** 与后端通过 REST/WS 集成

### `apps/web/components`
前端 UI 组件库（业务 + 复用）

- **用途：** 前端 UI 组件库（业务 + 复用）
- **包含：** UI 组件、面板、图形/协作相关组件（约 125 个代码文件）
- **集成：** 消费 contexts/hooks 与 packages/ui

### `apps/web/contexts`
React Context 状态与跨组件依赖

- **用途：** React Context 状态与跨组件依赖
- **包含：** User/Graph/Comments 等上下文 Provider（约 6 个代码文件）
- **入口：** `apps/web/app/providers.tsx`

### `apps/web/hooks`
前端 Hooks（数据、协作、WS、业务逻辑）

- **用途：** 前端 Hooks（数据、协作、WS、业务逻辑）
- **包含：** 封装 fetch、socket.io-client、交互行为（约 49 个代码文件）
- **集成：** 对接 /api 与 /notifications

### `apps/api/src`
NestJS 入口与业务模块

- **用途：** NestJS 入口与业务模块
- **包含：** AppModule + modules/*（Controller/Service/Repository）（约 84 个代码文件）
- **入口：** `apps/api/src/main.ts`
- **集成：** 对外提供 /api HTTP 与 WS

### `packages/database/prisma`
Prisma schema 与 migrations

- **用途：** Prisma schema 与 migrations
- **包含：** schema.prisma + migrations/ + seed（约 2 个代码文件）
- **入口：** `packages/database/prisma/schema.prisma`
- **集成：** 供 @cdm/api 使用

### `packages/database/src`
数据库封装层（Repository/Database）

- **用途：** 数据库封装层（Repository/Database）
- **包含：** PrismaClient 包装、Repository 基类与事件（约 5 个代码文件）
- **入口：** `packages/database/src/client.ts`
- **集成：** 供后端与插件复用

### `packages/types/src`
共享领域类型（TS）

- **用途：** 共享领域类型（TS）
- **包含：** 节点/边/审批/评论/订阅/通知等类型定义（约 13 个代码文件）
- **入口：** `packages/types/src/index.ts`
- **集成：** web/api 共用

### `packages/ui/src`
共享 UI 基础设施

- **用途：** 共享 UI 基础设施
- **包含：** Toast/Confirm 等 UI Provider 与样式（约 10 个代码文件）
- **入口：** `packages/ui/src/index.ts`
- **集成：** web 通过 @cdm/ui 引用

## Part 结构（按应用拆分）

### @cdm/web（web）
位置：`apps/web`
```
web/
├── __tests__/
│   ├── components/
│   │   ├── nodes/
│   │   │   └── SemanticZoomLOD.test.tsx
│   │   ├── notifications/
│   │   │   └── NotificationList.test.tsx
│   │   ├── ProductLibrary/
│   │   │   └── ProductSearchDialog.test.tsx
│   │   ├── PropertyPanel/
│   │   │   ├── ApprovalStatusPanel.contract.test.tsx
│   │   │   ├── ApprovalStepper.contract.test.tsx
│   │   │   ├── DeliverablesSection.contract.test.tsx
│   │   │   ├── PBSForm.test.tsx
│   │   │   └── TaskForm.knowledge.test.tsx
│   │   ├── TemplateLibrary/
│   │   │   └── TemplateLibraryDialog.test.tsx
│   │   ├── DrillBreadcrumb.test.tsx
│   │   ├── MinimapContainer.test.tsx
│   │   ├── OutlineItem.test.tsx
│   │   ├── OutlinePanel.test.tsx
│   │   ├── RightSidebarApprovalUpdate.test.tsx
│   │   ├── RightSidebarDebounce.test.tsx
│   │   ├── RightSidebarEnsureNodeExistsBackfill.test.tsx
│   │   ├── RightSidebarTimestamps.test.tsx
│   │   ├── RightSidebarYDocFallback.test.tsx
│   │   └── ZoomIndicator.test.tsx
│   ├── features/
│   │   ├── data-library/
│   │   │   ├── AssetFilterBar.test.tsx
│   │   │   ├── DualSearch.test.tsx
│   │   │   ├── GroupedAssetList.test.tsx
│   │   │   ├── LinkAssetDialog.test.tsx
│   │   │   ├── LinkedAssetsSection.test.tsx
│   │   │   ├── QuickTypePicker.test.tsx
│   │   │   ├── ScopeSelector.test.tsx
│   │   │   ├── UploadButton.test.tsx
│   │   │   ├── UploadTypeDropdown.test.tsx
│   │   │   ├── useAssetFilterState.test.ts
│   │   │   ├── useAssetLinks.test.tsx
│   │   │   ├── useContextAwareUpload.test.ts
│   │   │   └── useDataUpload.test.tsx
│   │   ├── views/
│   │   │   ├── useGanttData.test.ts
│   │   │   ├── useKanbanData.test.ts
│   │   │   ├── useViewStore.test.ts
│   │   │   ├── ViewContainer.test.tsx
│   │   │   └── ViewSwitcher.test.tsx
│   │   └── GraphSyncManager.test.ts
│   ├── hooks/
│   │   ├── useDependencyMode.test.ts
│   │   ├── useDrillDown.test.ts
│   │   ├── useFocusMode.test.ts
│   │   ├── useGraphHotkeys.test.ts
│   │   ├── useMediaQuery.test.ts
│   │   ├── useMinimap.test.ts
│   │   ├── useMinimapStorage.test.ts
│   │   ├── useNodeCollapse.test.ts
│   │   ├── useNotifications.test.ts
│   │   ├── useOutlineData.test.ts
│   │   ├── useProductSearch.test.ts
│   │   ├── useSelection.test.ts
│   │   ├── useTemplates.test.ts
│   │   └── useZoomShortcuts.test.ts
│   ├── lib/
│   │   ├── edgeRouting.test.ts
│   │   ├── edgeShapes.test.ts
│   │   ├── edgeValidation.test.ts
│   │   └── semanticZoomLOD.test.ts
│   ├── GraphComponent.test.tsx
│   └── setup.ts
├── app/
│   ├── api/
│   │   └── comments/
│   │       └── attachments/
│   ├── graph/
│   │   └── [graphId]/
│   │       └── page.tsx
│   ├── graphs/
│   │   └── page.tsx
│   ├── poc/
│   │   └── design-system/
│   │       └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/
│   ├── App/
│   │   ├── __tests__/
│   │   │   └── app-utils.test.ts
│   │   ├── app-utils.ts
│   │   ├── AppExecutionState.tsx
│   │   ├── AppFileManager.tsx
│   │   ├── AppForm.tsx
│   │   ├── AppIOConfig.tsx
│   │   ├── AppLibraryDialog.tsx
│   │   ├── AppSourceSelector.tsx
│   │   ├── FilePreviewModal.tsx
│   │   └── index.ts
│   ├── ArchiveBox/
│   │   └── ArchiveDrawer.tsx
│   ├── collab/
│   │   ├── ActiveUsersAvatarStack.tsx
│   │   ├── CollaborationErrorBoundary.tsx
│   │   ├── index.ts
│   │   └── RemoteCursor.tsx
│   ├── CommandPalette/
│   │   └── GlobalSearchDialog.tsx
│   ├── Comments/
│   │   ├── AttachmentPreview.tsx
│   │   ├── AttachmentViewer.tsx
│   │   ├── CommentInput.tsx
│   │   ├── CommentItem.tsx
│   │   ├── CommentPanel.tsx
│   │   └── index.ts
│   ├── graph/
│   │   ├── hooks/
│   │   │   ├── focusModeUtils.ts
│   │   │   ├── index.ts
│   │   │   ├── useDrillDown.ts
│   │   │   ├── useFocusMode.ts
│   │   │   ├── useGraphContextMenu.ts
│   │   │   ├── useGraphCursor.ts
│   │   │   ├── useGraphDependencyMode.ts
│   │   │   ├── useGraphEvents.ts
│   │   │   ├── useGraphHotkeys.ts
│   │   │   ├── useGraphInitialization.ts
│   │   │   ├── useGraphSelection.ts
│   │   │   ├── useGraphTransform.ts
│   │   │   ├── useMinimap.ts
│   │   │   ├── useNodeCollapse.ts
│   │   │   ├── useOutlineData.ts
│   │   │   └── useZoomShortcuts.ts
│   │   ├── parts/
│   │   │   ├── ConnectionStatus.tsx
│   │   │   ├── DependencyModeIndicator.tsx
│   │   │   ├── DrillBreadcrumb.tsx
│   │   │   ├── EdgeContextMenu.tsx
│   │   │   ├── FocusModeButton.tsx
│   │   │   ├── index.ts
│   │   │   ├── MinimapContainer.tsx
│   │   │   ├── MinimapToggleButton.tsx
│   │   │   ├── NodeContextMenu.tsx
│   │   │   ├── OutlineItem.tsx
│   │   │   ├── OutlinePanel.tsx
│   │   │   └── ZoomIndicator.tsx
│   │   ├── GraphComponent.tsx
│   │   └── index.ts
│   ├── KeyboardShortcutsGuide/
│   │   ├── index.ts
│   │   └── KeyboardShortcutsGuide.tsx
│   ├── Knowledge/
│   │   ├── index.ts
│   │   ├── KnowledgeRecommendation.tsx
│   │   └── KnowledgeSearchDialog.tsx
│   ├── layout/
│   │   ├── index.ts
│   │   ├── LeftSidebar.tsx
│   │   ├── RightSidebar.tsx
│   │   └── TopBar.tsx
│   ├── nodes/
│   │   ├── hooks/
│   │   │   ├── index.ts
│   │   │   ├── useAppExecution.ts
│   │   │   ├── useNodeDataSync.ts
│   │   │   └── useNodeEditing.ts
│   │   ├── rich/
│   │   │   ├── Footer.tsx
│   │   │   ├── HangingPill.tsx
│   │   │   ├── index.ts
│   │   │   ├── MetricsRow.tsx
│   │   │   ├── renderers.tsx
│   │   │   ├── RichNodeContext.tsx
│   │   │   ├── RichNodeLayout.tsx
│   │   │   ├── StatusHeader.tsx
│   │   │   └── TitleRow.tsx
│   │   ├── ChildCountBadge.tsx
│   │   ├── index.ts
│   │   ├── LegacyCardNode.tsx
│   │   ├── MindNode.tsx
│   │   ├── nodeConfig.ts
│   │   ├── OrdinaryNode.tsx
│   │   └── RichNode.tsx
│   ├── notifications/
│   │   ├── __tests__/
│   │   ├── index.ts
│   │   ├── NotificationBell.tsx
│   │   └── NotificationList.tsx
│   ├── performance/
│   ├── ProductLibrary/
│   │   ├── index.ts
│   │   ├── ProductCard.tsx
│   │   ├── ProductSearchDialog.tsx
│   │   ├── ProductSearchForm.tsx
│   │   └── ProductSearchResults.tsx
│   ├── PropertyPanel/
│   │   ├── ApprovalActions.tsx
│   │   ├── ApprovalHistory.tsx
│   │   ├── ApprovalStatus.tsx
│   │   ├── ApprovalStatusPanel.tsx
│   │   ├── CommonHeader.tsx
│   │   ├── DataForm.tsx
│   │   ├── DataPreviewDialog.tsx
│   │   ├── DeliverablesPreviewModal.tsx
│   │   ├── DeliverablesSection.tsx
│   │   ├── index.tsx
│   │   ├── KnowledgeResourcesSection.tsx
│   │   ├── LinkedAssetsSection.tsx
│   │   ├── OrdinaryForm.tsx
│   │   ├── PBSForm.tsx
│   │   ├── PropertyPanelRegistry.tsx
│   │   ├── RejectReasonDialog.tsx
│   │   ├── RequirementForm.tsx
│   │   ├── TagEditor.tsx
│   │   ├── TaskDispatchSection.tsx
│   │   ├── TaskForm.tsx
│   │   └── WorkflowConfigDialog.tsx
│   ├── TemplateLibrary/
│   │   ├── __tests__/
│   │   │   └── SaveTemplateDialog.test.tsx
│   │   ├── index.ts
│   │   ├── MiniTreePreview.tsx
│   │   ├── SaveTemplateDialog.tsx
│   │   ├── SaveTemplateDialogContent.tsx
│   │   ├── TemplateCardMini.tsx
│   │   ├── TemplateLibraryDialog.tsx
│   │   ├── TemplateLibraryFooter.tsx
│   │   ├── TemplateLibraryPreviewPanel.tsx
│   │   ├── TemplateLibraryTemplateGrid.tsx
│   │   └── TemplateNodePreview.tsx
│   ├── toolbar/
│   │   ├── ClipboardToolbar.tsx
│   │   └── LayoutSwitcher.tsx
│   └── UserSelector/
│       ├── index.ts
│       └── UserSelector.tsx
├── config/
│   └── keyboard-shortcuts.ts
├── contexts/
│   ├── AppLibraryContext.tsx
│   ├── CollaborationUIContext.tsx
│   ├── CommentCountContext.tsx
│   ├── GraphContext.tsx
│   ├── index.ts
│   └── UserContext.tsx
├── e2e/
│   ├── fixtures/
│   │   ├── upload-sample.pdf
│   │   ├── upload-sample.step
│   │   ├── upload-sample.stl
│   │   ├── upload-sample.unknown
│   │   └── upload-sample.vtk
│   ├── app-node.spec.ts
│   ├── arrow_key_navigation.spec.ts
│   ├── clipboard-data-sanitization.spec.ts
│   ├── clipboard-operations.spec.ts
│   ├── collaboration.spec.ts
│   ├── context-menu-selection.spec.ts
│   ├── data-library-views.spec.ts
│   ├── data-library.spec.ts
│   ├── data-upload-node-linking.spec.ts
│   ├── dependency-mode.spec.ts
│   ├── drill-down.spec.ts
│   ├── edit_mode.spec.ts
│   ├── enter_key_creates_sibling.spec.ts
│   ├── knowledge-mock.spec.ts
│   ├── layout-switching.spec.ts
│   ├── minimap.spec.ts
│   ├── model-viewer.spec.ts
│   ├── multi-view-synchronization.spec.ts
│   ├── node-collapse.spec.ts
│   ├── node-order.spec.ts
│   ├── node-type-conversion.spec.ts
│   ├── notification-center.spec.ts
│   ├── outline-view.spec.ts
│   ├── pbs-enhancement.spec.ts
│   ├── permanent-delete.spec.ts
│   ├── property-panel-binding.spec.ts
│   ├── semantic-zoom-lod.spec.ts
│   ├── tab_key_creates_child.spec.ts
│   ├── template-library.spec.ts
│   ├── testUtils.ts
│   ├── toolbar-redesign.spec.ts
│   ├── watch_subscription.spec.ts
│   └── zoom-shortcuts.spec.ts
├── features/
│   ├── collab/
│   │   ├── GraphSyncManager.ts
│   │   └── index.ts
│   ├── data-library/
│   │   ├── __tests__/
│   │   │   ├── AssetCard.test.tsx
│   │   │   ├── AssetGrid.test.tsx
│   │   │   ├── BindingTargetBanner.test.tsx
│   │   │   ├── DataLibraryBindingContext.test.tsx
│   │   │   ├── DataLibraryDrawer.test.tsx
│   │   │   ├── getAssetPreviewType.test.ts
│   │   │   ├── OrganizationViews.test.tsx
│   │   │   ├── SelectedAssetsTray.test.tsx
│   │   │   ├── useBatchAssetBinding.test.ts
│   │   │   └── useDataAssets.test.ts
│   │   ├── api/
│   │   │   └── data-assets.ts
│   │   ├── components/
│   │   │   ├── __tests__/
│   │   │   ├── asset-filter/
│   │   │   ├── binding/
│   │   │   ├── data-library-drawer/
│   │   │   ├── dnd/
│   │   │   ├── folder-tree/
│   │   │   ├── node-tree/
│   │   │   ├── AssetCard.tsx
│   │   │   ├── AssetGrid.tsx
│   │   │   ├── AssetList.tsx
│   │   │   ├── ContextAwareUploadButton.tsx
│   │   │   ├── DataLibraryDrawer.tsx
│   │   │   ├── FolderTreeView.tsx
│   │   │   ├── GroupedAssetList.tsx
│   │   │   ├── index.ts
│   │   │   ├── LinkAssetDialog.tsx
│   │   │   ├── OrganizationTabs.tsx
│   │   │   ├── PbsTreeView.tsx
│   │   │   ├── QuickTypePicker.tsx
│   │   │   ├── TaskGroupView.tsx
│   │   │   ├── TaskItemDetails.tsx
│   │   │   ├── TrashAssetRow.tsx
│   │   │   ├── TrashDrawer.tsx
│   │   │   ├── UploadButton.tsx
│   │   │   └── UploadTypeDropdown.tsx
│   │   ├── contexts/
│   │   │   ├── DataLibraryBindingContext.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── __tests__/
│   │   │   ├── index.ts
│   │   │   ├── useAssetDelete.ts
│   │   │   ├── useAssetFilterState.ts
│   │   │   ├── useAssetLinks.ts
│   │   │   ├── useAssetPreview.ts
│   │   │   ├── useAssetSelection.ts
│   │   │   ├── useBatchAssetBinding.ts
│   │   │   ├── useContextAwareUpload.ts
│   │   │   ├── useDataAssets.ts
│   │   │   ├── useDataFolders.ts
│   │   │   ├── useDataLibraryDrawerOrgState.ts
│   │   │   ├── useDataUpload.ts
│   │   │   ├── useNodeAssetUnlink.ts
│   │   │   ├── useNodeTreeProjection.ts
│   │   │   ├── usePbsAssets.ts
│   │   │   ├── usePbsNodes.ts
│   │   │   ├── useSelectedNodesAssets.ts
│   │   │   ├── useTaskAssets.ts
│   │   │   ├── useTaskNodes.ts
│   │   │   └── useTrashAssets.ts
│   │   ├── utils/
│   │   │   ├── formatFileSize.ts
│   │   │   └── linkAssetDialog.ts
│   │   └── index.ts
│   ├── industrial-viewer/
│   │   ├── __tests__/
│   │   │   ├── ColorBar.test.tsx
│   │   │   ├── ColorScaleControl.test.tsx
│   │   │   ├── ContourViewer.test.tsx
│   │   │   ├── meshHighlight.test.ts
│   │   │   ├── ModelStructureTree.test.tsx
│   │   │   ├── ModelViewer.test.tsx
│   │   │   ├── ModelViewerModal.test.tsx
│   │   │   ├── useContourViewer.test.tsx
│   │   │   └── ViewerToolbar.test.tsx
│   │   ├── components/
│   │   │   ├── ColorBar.tsx
│   │   │   ├── ColorScaleControl.tsx
│   │   │   ├── ContourViewer.tsx
│   │   │   ├── ContourViewerModal.tsx
│   │   │   ├── ModelStructureTree.tsx
│   │   │   ├── ModelViewer.tsx
│   │   │   ├── ModelViewerModal.tsx
│   │   │   └── ViewerToolbar.tsx
│   │   ├── constants/
│   │   │   └── colorMaps.ts
│   │   ├── hooks/
│   │   │   ├── useContourViewer.ts
│   │   │   ├── useOnline3DViewer.ts
│   │   │   └── useViewerEnhancement.ts
│   │   ├── types/
│   │   │   └── contour.ts
│   │   ├── utils/
│   │   │   ├── externalLibraryLoader.ts
│   │   │   ├── loadContourData.ts
│   │   │   └── meshHighlight.ts
│   │   └── index.ts
│   └── views/
│       ├── components/
│       │   ├── GanttView/
│       │   ├── KanbanView/
│       │   ├── ViewContainer.tsx
│       │   └── ViewSwitcher.tsx
│       ├── stores/
│       │   └── useViewStore.ts
│       └── index.ts
├── hooks/
│   ├── __tests__/
│   │   ├── clipboardCut.spec.ts
│   │   ├── clipboardDelete.spec.ts
│   │   ├── clipboardPaste.spec.ts
│   │   ├── clipboardSerializer.spec.ts
│   │   ├── useApproval.spec.ts
│   │   ├── useTaskDispatch.spec.ts
│   │   └── useTemplateInsert.spec.ts
│   ├── clipboard/
│   │   ├── clipboardCut.ts
│   │   ├── clipboardDelete.ts
│   │   ├── clipboardPaste.ts
│   │   ├── clipboardSerializer.ts
│   │   ├── index.ts
│   │   └── pasteHelpers.ts
│   ├── right-sidebar/
│   │   ├── ensureNodeExists.ts
│   │   ├── index.ts
│   │   ├── nodeDataUtils.ts
│   │   ├── useRightSidebarActions.ts
│   │   ├── useRightSidebarNodeData.ts
│   │   └── yDocSync.ts
│   ├── useAppLibrary.ts
│   ├── useApproval.ts
│   ├── useApprovalConfig.ts
│   ├── useArchive.ts
│   ├── useAttachmentUpload.ts
│   ├── useClipboard.ts
│   ├── useClipboardShortcuts.ts
│   ├── useCollaboration.ts
│   ├── useCommentActions.ts
│   ├── useCommentCount.ts
│   ├── useComments.ts
│   ├── useDependencyMode.ts
│   ├── useEditingState.ts
│   ├── useGlobalShortcut.ts
│   ├── useGraph.ts
│   ├── useGraphs.ts
│   ├── useKnowledge.ts
│   ├── useLayoutPlugin.ts
│   ├── useMediaQuery.ts
│   ├── useMindmapPlugin.ts
│   ├── useMinimapStorage.ts
│   ├── useNotifications.ts
│   ├── useProductSearch.ts
│   ├── useSearch.ts
│   ├── useSelection.ts
│   ├── useSubscription.ts
│   ├── useTaskDispatch.ts
│   ├── useTemplateInsert.ts
│   ├── useTemplates.ts
│   └── useUserSearch.ts
├── lib/
│   ├── __tests__/
│   │   ├── drillDownStore.test.ts
│   │   └── subtree-extractor.spec.ts
│   ├── api/
│   │   ├── __tests__/
│   │   │   ├── api-services.test.ts
│   │   │   └── nodes.test.ts
│   │   ├── app-library.ts
│   │   ├── approval.ts
│   │   ├── archive.ts
│   │   ├── comments.ts
│   │   ├── index.ts
│   │   ├── knowledge.ts
│   │   ├── nodes.ts
│   │   ├── templates.ts
│   │   └── users.ts
│   ├── commentCountStore.ts
│   ├── constants.ts
│   ├── drillDownStore.ts
│   ├── edgeRouting.ts
│   ├── edgeRoutingConstants.ts
│   ├── edgeShapes.ts
│   ├── edgeStyles.ts
│   ├── edgeValidation.ts
│   ├── logger.ts
│   ├── productLibrary.ts
│   ├── semanticZoomLOD.ts
│   ├── subscriptionStore.ts
│   └── subtree-extractor.ts
├── public/
│   ├── libs/
│   │   ├── draco/
│   │   │   ├── draco_decoder.min.js
│   │   │   ├── draco_decoder.wasm
│   │   │   └── draco_decoder_nodejs.min.js
│   │   ├── rhino3dm/
│   │   │   └── rhino3dm.min.js
│   │   └── web-ifc/
│   │       └── web-ifc-api-iife.js
│   ├── mock/
│   │   └── storage/
│   │       ├── AntiqueCamera.glb
│   │       ├── Avocado.glb
│   │       ├── Box.glb
│   │       ├── DamagedHelmet.glb
│   │       ├── Duck.glb
│   │       ├── Satellite.step
│   │       ├── SolarPanel.glb
│   │       ├── SolarPanel.obj
│   │       ├── Specs.pdf
│   │       ├── 帆板网格模型.stl
│   │       ├── 热控系统温度场.vtp
│   │       └── 结构应力分析.scalar.json
│   └── thumbnails/
│       └── mock-3d.png
├── types/
│   ├── online-3d-viewer.d.ts
│   └── vtk.d.ts
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── vitest-web.json
└── vitest.config.ts
```

### @cdm/api（api）
位置：`apps/api`
```
api/
├── scripts/
│   ├── create-story-9-data.ts
│   ├── generate-story-9-assets.ts
│   └── generate_satellite_vtp.py
├── src/
│   ├── demo/
│   │   └── demo-seed.service.ts
│   ├── modules/
│   │   ├── app-library/
│   │   │   ├── app-executor.service.ts
│   │   │   ├── app-library.controller.ts
│   │   │   ├── app-library.module.ts
│   │   │   ├── app-library.service.ts
│   │   │   ├── index.ts
│   │   │   └── mock-data.ts
│   │   ├── collab/
│   │   │   ├── collab.module.ts
│   │   │   ├── collab.service.spec.ts
│   │   │   ├── collab.service.ts
│   │   │   └── index.ts
│   │   ├── data-management/
│   │   │   ├── __tests__/
│   │   │   ├── dto/
│   │   │   ├── guards/
│   │   │   ├── utils/
│   │   │   ├── data-asset.controller.ts
│   │   │   ├── data-asset.repository.ts
│   │   │   ├── data-asset.service.ts
│   │   │   ├── data-folder.repository.ts
│   │   │   ├── data-folder.service.ts
│   │   │   ├── data-management.module.ts
│   │   │   ├── index.ts
│   │   │   ├── mock-data.ts
│   │   │   ├── node-data-link.repository.ts
│   │   │   └── node-data-link.service.ts
│   │   ├── file/
│   │   │   ├── file.controller.ts
│   │   │   ├── file.module.ts
│   │   │   ├── file.service.ts
│   │   │   └── index.ts
│   │   ├── graphs/
│   │   │   ├── __tests__/
│   │   │   ├── graph.repository.ts
│   │   │   ├── graphs.controller.ts
│   │   │   ├── graphs.module.ts
│   │   │   ├── graphs.service.ts
│   │   │   └── index.ts
│   │   ├── knowledge-library/
│   │   │   ├── index.ts
│   │   │   ├── knowledge-library.controller.ts
│   │   │   └── knowledge-library.module.ts
│   │   ├── notification/
│   │   │   ├── __tests__/
│   │   │   ├── notification.controller.ts
│   │   │   ├── notification.gateway.ts
│   │   │   ├── notification.module.ts
│   │   │   ├── notification.repository.ts
│   │   │   └── notification.service.ts
│   │   ├── plugin-kernel/
│   │   │   ├── kernel-plugin-manager.service.spec.ts
│   │   │   ├── kernel-plugin-manager.service.ts
│   │   │   └── plugin-kernel.module.ts
│   │   ├── product-library/
│   │   │   ├── index.ts
│   │   │   ├── product-library.controller.ts
│   │   │   └── product-library.module.ts
│   │   ├── subscriptions/
│   │   │   ├── __tests__/
│   │   │   ├── subscription.listener.ts
│   │   │   ├── subscriptions.controller.ts
│   │   │   ├── subscriptions.module.ts
│   │   │   ├── subscriptions.repository.ts
│   │   │   └── subscriptions.service.ts
│   │   └── users/
│   │       ├── index.ts
│   │       ├── users.controller.ts
│   │       ├── users.module.ts
│   │       └── users.service.ts
│   ├── pipes/
│   │   └── zod-validation.pipe.ts
│   ├── app.controller.spec.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   ├── main.ts
│   └── plugin-migration.cleanup.spec.ts
├── uploads/
│   ├── comments/
│   ├── _mz1D3wg-KinF817zllLz.png
│   ├── JGdru0szGjjVat_UAgswZ.png
│   ├── uN4zx7tsVRRrxvW_GtP8e.png
│   └── X0NStcr2UGpiCRcQflE38.png
├── .env
├── .env.example
├── clean-db.ts
├── eslint.config.mjs
├── jest.config.js
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.spec.json
```

## 集成点（Integration Points）

### web → api
- **位置：** `apps/web/lib/api/*, apps/web/hooks/*`
- **类型：** REST (fetch)
- **细节：** 默认访问 http://localhost:3001/api/*；请求通常携带 x-user-id。

### web → api
- **位置：** `apps/web/hooks/useNotifications.ts`
- **类型：** Socket.IO (/notifications)
- **细节：** 客户端 join(userId) 加入 user:{userId} 房间，服务端推送 notification:* 事件。

### web → api
- **位置：** `apps/web/app/graph/[graphId]/page.tsx`
- **类型：** Hocuspocus (Yjs 协作, ws://localhost:1234)
- **细节：** 文档命名 graph:<graphId>；COLLAB_WS_PORT 默认 1234。

## 入口（Entry Points）
- **API 服务：** `apps/api/src/main.ts`（Nest bootstrap；全局前缀 `/api`；默认端口 3001）
- **Web 应用：** `apps/web/app/*`（Next App Router；默认端口 3000）
- **协作 WS：** `apps/api/src/modules/collab/collab.service.ts`（Hocuspocus；默认端口 1234）

## 配置文件（Configuration Files）
- `.env.example`
- `docker-compose.yml`
- `pnpm-workspace.yaml`
- `turbo.json`
- `apps/web/next.config.ts`
- `apps/web/tailwind.config.ts`
- `apps/api/nest-cli.json`

## 开发注意事项
- 需要本地 PostgreSQL（可用 `docker compose up -d postgres`）。
- 前后端默认通过 `NEXT_PUBLIC_API_BASE_URL`/`NEXT_PUBLIC_API_URL` 连接后端；协作 WS 用 `NEXT_PUBLIC_COLLAB_WS_URL`。
- 测试：web 使用 Vitest + Playwright；api 使用 Jest。

---

_Generated using BMAD Method `document-project` workflow_
