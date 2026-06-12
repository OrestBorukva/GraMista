import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/session';
import { ensureOverlayKey } from '@/lib/publicUser';
import { saveProfileAction, disconnectMonoAction, regenerateOverlayAction } from './actions';
import { toCommentMode, wordListsForUi } from '@/lib/censor';
import { MonoConnect } from './MonoConnect';
import { CommentSettings } from './CommentSettings';
import { TwoFactorSettings } from './TwoFactor';
import { Hint } from '@/app/Hint';
import { CopyButton } from '@/app/CopyButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Налаштування' };

export default async function SettingsPage() {
  const U = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: U },
    select: { handle: true, monobankJarUrl: true, twitchUrl: true, youtubeUrl: true, publicShowStreams: true, showOnGlobalMap: true, twoFactorEnabled: true, commentMode: true, bannedWordsAdded: true, bannedWordsAllowed: true, showCommentPublic: true },
  });
  const mode = toCommentMode(user?.commentMode);
  const wordLists = wordListsForUi(user?.bannedWordsAdded ?? '', user?.bannedWordsAllowed ?? '');
  const overlayKey = await ensureOverlayKey(prisma, U);
  const source = await prisma.donationSource.findFirst({
    where: { userId: U, type: 'monobank' },
    select: { status: true, title: true, lastEventAt: true },
  });
  const connected = source?.status === 'active';

  // Повна адреса публічної сторінки (для копіювання) і хост без протоколу (для показу).
  const base = process.env.APP_BASE_URL ?? '';
  const host = base.replace(/^https?:\/\//, '') || 'gramista';

  return (
    <main className="settings scroll">
      <h1>Налаштування</h1>

      <section>
        <h2>Банка monobank (джерело донатів)</h2>
        <MonoConnect connected={connected} title={source?.title ?? null} />
        {connected && source?.lastEventAt && (
          <small>Остання подія від банку: {source.lastEventAt.toLocaleString('uk-UA')}</small>
        )}
        {connected && (
          <form action={disconnectMonoAction}>
            <button type="submit" className="btn-danger">Відключити</button>
            <small>
              Нові події перестануть прийматись одразу; сам monobank вимкне сповіщення
              протягом ~10 хвилин після наступного руху на рахунку. Щоб розірвати звʼязок
              миттєво — перегенеруй токен на api.monobank.ua.
            </small>
          </form>
        )}
      </section>

      <section>
        <h2>Профіль і посилання</h2>
        <form action={saveProfileAction}>
          <label>
            <span className="lbl-row">
              Публічний слаг
              <Hint>
                Ваша адреса в GraMista: {host}/&lt;слаг&gt;. Це сторінка з живою мапою і топом
                міст, яку ви даєте глядачам. 3–30 символів: латинські літери, цифри, _ або -.
              </Hint>
            </span>
            <input name="handle" defaultValue={user?.handle ?? ''} placeholder="orest" />
          </label>
          <label>
            <span className="lbl-row">
              Банка monobank
              <Hint>
                Посилання на вашу банку (send.monobank.ua/jar/…). Глядачі побачать на публічній
                сторінці кнопку «Задонатити» і QR-код, що ведуть на неї.
              </Hint>
            </span>
            <input name="monobankJarUrl" defaultValue={user?.monobankJarUrl ?? ''} placeholder="https://send.monobank.ua/jar/..." />
          </label>
          <label>
            <span className="lbl-row">
              Twitch
              <Hint>Кнопка «Twitch» у шапці публічної сторінки — щоб глядачі перейшли на ваш канал.</Hint>
            </span>
            <input name="twitchUrl" defaultValue={user?.twitchUrl ?? ''} placeholder="https://twitch.tv/..." />
          </label>
          <label>
            <span className="lbl-row">
              YouTube
              <Hint>Кнопка «YouTube» у шапці публічної сторінки — щоб глядачі перейшли на ваш канал.</Hint>
            </span>
            <input name="youtubeUrl" defaultValue={user?.youtubeUrl ?? ''} placeholder="https://youtube.com/@..." />
          </label>
          <div className="set-line">
            <label className="set-row">
              <input type="checkbox" name="publicShowStreams" defaultChecked={user?.publicShowStreams ?? true} />
              Показувати минулі стріми на публічній сторінці
            </label>
            <Hint>
              Глядачі бачитимуть перелік завершених стрімів і скільки зібрано на кожному. Вимкнете —
              блок зникне з публічної сторінки.
            </Hint>
          </div>
          <div className="set-line">
            <label className="set-row">
              <input type="checkbox" name="showOnGlobalMap" defaultChecked={user?.showOnGlobalMap ?? true} />
              Долучати мій збір до загальної мапи України
            </label>
            <Hint>
              Мапа України — спільна жива мапа всіх стрімерів GraMista: донати учасників (у гривнях)
              світяться на одній мапі країни, а ви з’являєтесь у списку учасників. Вимкнете — ваші
              донати буде видно лише на вашій сторінці; на бали й топ міст це не впливає.
            </Hint>
            <a href="/ukraine" target="_blank" rel="noreferrer">Мапа України ↗</a>
          </div>
          <button type="submit">Зберегти</button>
        </form>
        {user?.handle && (
          <p className="pub-link">
            Публічна сторінка:{' '}
            <a href={`/${user.handle}`} target="_blank" rel="noreferrer">
              {host}/{user.handle}
            </a>
            <CopyButton text={`${base}/${user.handle}`} label="Копіювати" />
          </p>
        )}
      </section>

      <section>
        <h2>Коментарі донатів і цензура</h2>
        <p>
          Текст коментаря з банки можна показувати глядачам на публічній сторінці й в оверлеях.
          Заборонені слова ховаються автоматично. Показ в оверлеях вмикається окремо на вкладці
          «Оверлеї» (галочка «Коментар» у налаштуваннях силки).
        </p>
        <CommentSettings mode={mode} showPublic={user?.showCommentPublic ?? true} lists={wordLists} />
      </section>

      <section>
        <h2>Безпека</h2>
        <TwoFactorSettings enabled={user?.twoFactorEnabled ?? false} />
      </section>

      <section>
        <h2>Силки оверлеїв</h2>
        <p>Токен оверлеїв: <code>{overlayKey}</code></p>
        <form action={regenerateOverlayAction}>
          <button type="submit">Оновити силки оверлеїв (старі перестануть працювати)</button>
        </form>
      </section>
    </main>
  );
}
