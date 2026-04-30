import Link from "next/link"

export const metadata = { title: "Согласие на обработку персональных данных — яживой" }

export default function ConsentPage() {
  return (
    <div className="min-h-screen px-4 py-10 max-w-2xl mx-auto text-zinc-300">
      <h1 className="text-xl font-semibold text-zinc-100 mb-1">
        Согласие на обработку персональных данных
      </h1>
      <p className="text-xs text-zinc-500 mb-8">Последнее обновление: 30 апреля 2025 г.</p>

      <div className="text-sm leading-relaxed space-y-4">
        <p>
          Регистрируясь в сервисе «яживой» (далее — Сервис), расположенном по адресу{" "}
          <span className="text-zinc-400">stillalivee.ru</span>, я свободно, своей волей и в своём
          интересе даю согласие оператору персональных данных (далее — Оператор) на обработку
          следующих моих персональных данных:
        </p>

        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Идентификатор Telegram (Telegram ID)</li>
          <li>Имя пользователя в Telegram (username)</li>
          <li>Отображаемое имя, которое я укажу при регистрации</li>
          <li>Дата и время моих отметок (чекинов) в Сервисе</li>
          <li>Настройки интервала уведомлений</li>
          <li>Технические данные сессии (cookie-идентификатор)</li>
        </ul>

        <p>
          <strong className="text-zinc-200">Цели обработки:</strong> идентификация и
          аутентификация в Сервисе, предоставление функций Сервиса (фиксация отметок,
          уведомление добавленных мной пользователей), отправка уведомлений через Telegram.
        </p>

        <p>
          <strong className="text-zinc-200">Способы обработки:</strong> сбор, запись, хранение,
          уточнение, использование, передача в рамках функций Сервиса, удаление, уничтожение.
        </p>

        <p>
          <strong className="text-zinc-200">Срок действия согласия:</strong> до момента
          удаления аккаунта или отзыва согласия. После удаления аккаунта данные уничтожаются
          в течение 30 дней.
        </p>

        <p>
          <strong className="text-zinc-200">Отзыв согласия:</strong> я вправе отозвать
          настоящее согласие в любое время, удалив аккаунт через раздел «Настройки» или
          направив запрос на электронную почту{" "}
          <a href="mailto:abdullahdzambekov@gmail.com" className="text-emerald-500 underline">
            abdullahdzambekov@gmail.com
          </a>
          . Отзыв согласия не влияет на законность обработки данных до момента отзыва.
        </p>

        <p>
          Подтверждая настоящее согласие при регистрации, я подтверждаю, что ознакомлен(а) с{" "}
          <Link href="/privacy" className="text-emerald-500 underline">
            Политикой обработки персональных данных
          </Link>
          , понимаю её содержание и согласен(на) с её условиями.
        </p>
      </div>

      <div className="mt-10 flex gap-4 text-sm">
        <Link href="/privacy" className="text-emerald-500 underline">
          Политика обработки персональных данных
        </Link>
        <Link href="/" className="text-zinc-500 underline">
          ← на главную
        </Link>
      </div>
    </div>
  )
}
