import { BrandLogo } from "@/components/BrandLogo";

const categories = [
  "Все напитки",
  "Вода",
  "Газировки",
  "Лимонады",
  "Чай",
  "Натуральные напитки",
  "Энергетики",
  "Разные напитки"
];

export default function Home() {
  return (
    <main className="catalogPage">
      <header className="topBar">
        <BrandLogo />
        <div className="topBarNote">Грозный</div>
      </header>

      <section className="catalogShell" aria-labelledby="catalog-title">
        <div className="catalogIntro">
          <p className="sectionKicker">Оптовый каталог</p>
          <h1 id="catalog-title">Напитки для заказа</h1>
          <p>
            Каталог готовится к подключению товаров. Базовая страница уже
            открывается локально и остается без ссылки на админку.
          </p>
        </div>

        <div className="catalogStatus" aria-label="Состояние каталога">
          <span>0 товаров</span>
          <strong>Подготовка приложения</strong>
        </div>
      </section>

      <section className="catalogArea" aria-label="Каталог">
        <div className="categoryRail" aria-label="Категории напитков">
          {categories.map((category, index) => (
            <span
              className={index === 0 ? "categoryChip categoryChipActive" : "categoryChip"}
              key={category}
            >
              {category}
            </span>
          ))}
        </div>

        <div className="emptyCatalog">
          <span className="emptyMarker" aria-hidden="true" />
          <h2>Ассортимент пока не загружен</h2>
          <p>
            После подключения базы здесь появятся карточки напитков с фото,
            ценой, упаковкой и вкусами.
          </p>
        </div>
      </section>
    </main>
  );
}
