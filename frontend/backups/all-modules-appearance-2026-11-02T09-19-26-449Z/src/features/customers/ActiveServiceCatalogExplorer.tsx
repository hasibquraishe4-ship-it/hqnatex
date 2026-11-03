import { SecondaryButton as SharedSecondaryButton } from "../../components/Interface";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronDown,
  ChevronRight,
  List,
  Package,
  RadioTower,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import {
  fetchers,
  type Session,
} from "../../lib/api";

import {
  useTranslation,
} from "../../lib/i18n";

type Props = {
  session: Session;
  onOpenServices: () => void;
  onOpenPackages: () => void;
  onOpenTechnicalFields: () => void;
};

type ServiceRow = {
  id: string;
  category: string;
  category_name?: string;
  code: string;
  name_english: string;
  name_dari?: string;
  name_pashto?: string;
  status: string;
  technical_summary?: string;
  supports_equipment?: boolean | null;
  supports_noc?: boolean | null;
  technical_fields?: unknown[];
};

type CategoryRow = {
  id: string;
  code: string;
  name_english: string;
  name_dari?: string;
  name_pashto?: string;
};

async function loadAll(
  loader: (
    params: string,
  ) => Promise<{
    count: number;
    next: string | null;
    results: any[];
  }>,
) {
  const rows: any[] = [];

  for (
    let page = 1;
    page <= 50;
    page += 1
  ) {
    const result = await loader(
      `?page=${page}&page_size=100`,
    );

    rows.push(
      ...(result.results || []),
    );

    if (
      !result.next ||
      rows.length >= result.count
    ) {
      break;
    }
  }

  return rows;
}

export function ActiveServiceCatalogExplorer({
  session,
  onOpenServices,
  onOpenPackages,
  onOpenTechnicalFields,
}: Props) {
  const {
    t,
    language,
  } = useTranslation();

  const [services, setServices] =
    useState<ServiceRow[]>([]);

  const [categories, setCategories] =
    useState<CategoryRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [openGroups, setOpenGroups] =
    useState<Set<string>>(
      new Set(),
    );

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          serviceRows,
          categoryRows,
        ] = await Promise.all([
          loadAll((params) =>
            fetchers.services(
              session,
              params,
            ),
          ),
          loadAll((params) =>
            fetchers.categories(
              session,
              params,
            ),
          ),
        ]);

        if (!alive) return;

        const active =
          serviceRows.filter(
            (service) =>
              service.status ===
              "active",
          );

        setServices(active);
        setCategories(categoryRows);

        const firstCategory =
          active[0]?.category;

        if (firstCategory) {
          setOpenGroups(
            new Set([
              firstCategory,
            ]),
          );
        }
      } catch (err) {
        if (!alive) return;

        setError(
          err instanceof Error
            ? err.message
            : t.common.noRecords,
        );
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [session, t]);

  const categoryMap =
    useMemo(() => {
      return new Map(
        categories.map(
          (category) => [
            category.id,
            category,
          ],
        ),
      );
    }, [categories]);

  const localizedServiceName = (
    service: ServiceRow,
  ) => {
    if (
      language === "fa" &&
      service.name_dari
    ) {
      return service.name_dari;
    }

    if (
      language === "ps" &&
      service.name_pashto
    ) {
      return service.name_pashto;
    }

    return service.name_english;
  };

  const localizedCategoryName = (
    categoryId: string,
    fallback?: string,
  ) => {
    const category =
      categoryMap.get(
        categoryId,
      );

    if (!category) {
      return (
        fallback ||
        t.customersServicesUi
          .uncategorized
      );
    }

    if (
      language === "fa" &&
      category.name_dari
    ) {
      return category.name_dari;
    }

    if (
      language === "ps" &&
      category.name_pashto
    ) {
      return category.name_pashto;
    }

    return (
      category.name_english ||
      fallback ||
      category.code
    );
  };

  const filtered =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return services;
      }

      return services.filter(
        (service) => {
          return [
            service.code,
            service.name_english,
            service.name_dari,
            service.name_pashto,
            service.category_name,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(q),
            );
        },
      );
    }, [
      services,
      search,
    ]);

  const groups =
    useMemo(() => {
      const map =
        new Map<
          string,
          ServiceRow[]
        >();

      for (
        const service
        of filtered
      ) {
        const key =
          service.category ||
          "__none__";

        const existing =
          map.get(key) || [];

        existing.push(service);

        map.set(
          key,
          existing,
        );
      }

      return Array.from(
        map.entries(),
      ).sort(
        ([aId, aRows], [
          bId,
          bRows,
        ]) =>
          localizedCategoryName(
            aId,
            aRows[0]
              ?.category_name,
          ).localeCompare(
            localizedCategoryName(
              bId,
              bRows[0]
                ?.category_name,
            ),
          ),
      );
    }, [
      filtered,
      categoryMap,
      language,
    ]);

  const toggleGroup = (
    categoryId: string,
  ) => {
    setOpenGroups(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(categoryId)
        ) {
          next.delete(
            categoryId,
          );
        } else {
          next.add(
            categoryId,
          );
        }

        return next;
      },
    );
  };

  return (
    <section
      className="
        active-service-catalog
overflow-hidden
        rounded-[1.75rem]
        border
        border-slate-200/80
        bg-white/65
        shadow-sm
        backdrop-blur-xl
        dark:border-white/10
        dark:bg-white/5
      "
    >
      <div
        className="
          active-service-catalog-header
border-b
          border-slate-200/70
          p-5
          dark:border-white/10
        "
      >
        <div
          className="
            flex flex-col
            gap-4
            xl:flex-row
            xl:items-center
            xl:justify-between
          "
        >
          <div>
            <div
              className="
                flex items-center
                gap-3
              "
            >
              <div
                className="
                  grid h-11 w-11
                  place-items-center
                  rounded-2xl
                  bg-indigo-50
                  text-indigo-600
                  dark:bg-indigo-400/10
                  dark:text-indigo-300
                "
              >
                <RadioTower
                  className="
                    h-5 w-5
                  "
                />
              </div>

              <div>
                <h2
                  className="
                    text-base
                    font-black
                    text-slate-100
                    dark:text-white
                  "
                >
                  {
                    t.customersServicesUi
                      .activeServiceCatalog
                  }
                </h2>

                <p
                  className="
                    mt-1 text-xs
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  {
                    t.customersServicesUi
                      .activeServiceCatalogDesc
                  }
                </p>
              </div>
            </div>
          </div>

          <div
            className="
              flex flex-col
              gap-2
              sm:flex-row
            "
          >
            <div
              className="
                relative
                min-w-[260px]
              "
            >
              <Search
                className="
                  absolute
                  start-3 top-1/2
                  h-4 w-4
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value,
                  )
                }
                placeholder={
                  t.customersServicesUi
                    .searchActiveServices
                }
                className="
                  h-10 w-full
                  rounded-xl
                  border
                  border-slate-700/60
                  bg-white/80
                  ps-10 pe-3
                  text-xs
                  text-slate-200
                  outline-none
                  transition
                  focus:border-cyan-400
                  dark:border-white/10
                  dark:bg-white/5
                  dark:text-white
                "
              />
            </div>

            <SharedSecondaryButton
              type="button"
              onClick={
                onOpenServices
              }
              className="
                inline-flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-indigo-200
                bg-indigo-50
                px-4
                text-xs
                font-bold
                text-indigo-700
                transition
                hover:bg-indigo-100
                dark:border-indigo-400/20
                dark:bg-indigo-400/10
                dark:text-indigo-300
              "
            >
              <SlidersHorizontal
                className="
                  h-4 w-4
                "
              />

              {
                t.customersServicesUi
                  .manageServices
              }
            </SharedSecondaryButton>
          </div>
        </div>

        <div
          className="
            mt-4
            flex flex-wrap
            gap-2
          "
        >
          <span
            className="
              rounded-full
              border
              border-emerald-200
              bg-emerald-50
              px-3 py-1
              text-[11px]
              font-bold
              text-emerald-700
              dark:border-emerald-400/20
              dark:bg-emerald-400/10
              dark:text-emerald-300
            "
          >
            {
              t.customersServicesUi
                .activeOnly
            }
            {" · "}
            {services.length}
          </span>

          <span
            className="
              rounded-full
              border
              border-slate-700/60
              bg-slate-900/55
              px-3 py-1
              text-[11px]
              font-bold
              text-slate-600
              dark:border-white/10
              dark:bg-white/5
              dark:text-slate-400
            "
          >
            {
              t.customersServicesUi
                .serviceGroups
            }
            {" · "}
            {groups.length}
          </span>
        </div>
      </div>

      {error ? (
        <div
          className="
            p-5
            text-sm
            text-rose-600
            dark:text-rose-300
          "
        >
          {error}
        </div>
      ) : loading ? (
        <div
          className="
            p-10
            text-center
            text-sm
            text-slate-500
          "
        >
          {t.common.loading}
        </div>
      ) : (
        <div
          className="
            active-service-catalog-groups
space-y-2
            p-4
          "
        >
          {groups.map(
            ([
              categoryId,
              rows,
            ]) => {
              const isOpen =
                search.trim() !==
                  "" ||
                openGroups.has(
                  categoryId,
                );

              return (
                <div
                  key={
                    categoryId
                  }
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200/80
                    bg-white/55
                    dark:border-white/10
                    dark:bg-white/[0.025]
                  "
                >
                  <SharedSecondaryButton
                    type="button"
                    onClick={() =>
                      toggleGroup(
                        categoryId,
                      )
                    }
                    className="
                      active-service-group-header
flex w-full
                      items-center
                      justify-between
                      gap-4
                      px-5 py-4
                      text-start
                      transition
                      hover:bg-indigo-50/60
                      dark:hover:bg-white/5
                    "
                  >
                    <div
                      className="
                        flex items-center
                        gap-3
                      "
                    >
                      <div
                        className="
                          grid h-9 w-9
                          place-items-center
                          rounded-xl
                          bg-indigo-50
                          text-indigo-600
                          dark:bg-indigo-400/10
                          dark:text-indigo-300
                        "
                      >
                        {isOpen ? (
                          <ChevronDown
                            className="
                              h-4 w-4
                            "
                          />
                        ) : (
                          <ChevronRight
                            className="
                              h-4 w-4
                              rtl:rotate-180
                            "
                          />
                        )}
                      </div>

                      <div>
                        <div
                          className="
                            text-sm
                            font-black
                            text-slate-200
                            dark:text-white
                          "
                        >
                          {localizedCategoryName(
                            categoryId,
                            rows[0]
                              ?.category_name,
                          )}
                        </div>

                        <div
                          className="
                            mt-0.5
                            text-[11px]
                            text-slate-500
                          "
                        >
                          {rows.length}
                          {" "}
                          {
                            t.customersServicesUi
                              .servicesLabel
                          }
                        </div>
                      </div>
                    </div>

                    <div
                      className="
                        rounded-full
                        bg-emerald-50
                        px-3 py-1
                        text-[10px]
                        font-bold
                        text-emerald-700
                        dark:bg-emerald-400/10
                        dark:text-emerald-300
                      "
                    >
                      {
                        t.common.active
                      }
                    </div>
                  </SharedSecondaryButton>

                  {isOpen && (
                    <div
                      className="
                        border-t
                        border-slate-200/70
                        dark:border-white/10
                      "
                    >
                      {rows
                        .slice()
                        .sort(
                          (a, b) =>
                            a.code.localeCompare(
                              b.code,
                            ),
                        )
                        .map(
                          (
                            service,
                            index,
                          ) => (
                            <div
                              key={
                                service.id
                              }
                              className={`
                                active-service-row
grid gap-3
                                px-5 py-4
                                lg:grid-cols-[120px_minmax(220px,1fr)_150px_300px]
                                lg:items-center
                                ${
                                  index >
                                  0
                                    ? "border-t border-slate-200/60 dark:border-white/5"
                                    : ""
                                }
                              `}
                            >
                              <div
                                className="
                                  font-mono
                                  text-xs
                                  font-bold
                                  text-indigo-600
                                  dark:text-indigo-300
                                "
                              >
                                {
                                  service.code
                                }
                              </div>

                              <div>
                                <div
                                  className="
                                    text-sm
                                    font-bold
                                    text-slate-200
                                    dark:text-slate-100
                                  "
                                >
                                  {localizedServiceName(
                                    service,
                                  )}
                                </div>

                                {service.technical_summary && (
                                  <div
                                    className="
                                      mt-1
                                      line-clamp-1
                                      text-[11px]
                                      text-slate-500
                                    "
                                  >
                                    {
                                      service.technical_summary
                                    }
                                  </div>
                                )}
                              </div>

                              <div
                                className="
                                  flex
                                  flex-wrap
                                  gap-1.5
                                "
                              >
                                {service.supports_equipment && (
                                  <span
                                    className="
                                      rounded-lg
                                      bg-slate-900/70
                                      px-2 py-1
                                      text-[10px]
                                      text-slate-600
                                      dark:bg-white/5
                                      dark:text-slate-400
                                    "
                                  >
                                    {
                                      t.customersServicesUi
                                        .equipmentShort
                                    }
                                  </span>
                                )}

                                {service.supports_noc && (
                                  <span
                                    className="
                                      rounded-lg
                                      bg-slate-900/70
                                      px-2 py-1
                                      text-[10px]
                                      text-slate-600
                                      dark:bg-white/5
                                      dark:text-slate-400
                                    "
                                  >
                                    NOC
                                  </span>
                                )}
                              </div>

                              <div
                                className="
                                  flex
                                  flex-wrap
                                  justify-start
                                  gap-2
                                  lg:justify-end
                                "
                              >
                                <SharedSecondaryButton
                                  type="button"
                                  onClick={
                                    onOpenServices
                                  }
                                  className="
                                    rounded-lg
                                    border
                                    border-slate-700/60
                                    bg-slate-950/40
                                    px-3 py-2
                                    text-[11px]
                                    font-bold
                                    text-slate-600
                                    hover:border-indigo-300
                                    hover:text-indigo-700
                                    dark:border-white/10
                                    dark:bg-white/5
                                    dark:text-slate-300
                                  "
                                >
                                  {
                                    t.common.view
                                  }
                                </SharedSecondaryButton>

                                <SharedSecondaryButton
                                  type="button"
                                  onClick={
                                    onOpenPackages
                                  }
                                  className="
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    rounded-lg
                                    border
                                    border-slate-700/60
                                    bg-slate-950/40
                                    px-3 py-2
                                    text-[11px]
                                    font-bold
                                    text-slate-600
                                    hover:border-indigo-300
                                    hover:text-indigo-700
                                    dark:border-white/10
                                    dark:bg-white/5
                                    dark:text-slate-300
                                  "
                                >
                                  <Package
                                    className="
                                      h-3.5 w-3.5
                                    "
                                  />

                                  {
                                    t.serviceCatalog
                                      .packages
                                  }
                                </SharedSecondaryButton>

                                <SharedSecondaryButton
                                  type="button"
                                  onClick={
                                    onOpenTechnicalFields
                                  }
                                  className="
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    rounded-lg
                                    border
                                    border-indigo-200
                                    bg-indigo-50
                                    px-3 py-2
                                    text-[11px]
                                    font-bold
                                    text-indigo-700
                                    hover:bg-indigo-100
                                    dark:border-indigo-400/20
                                    dark:bg-indigo-400/10
                                    dark:text-indigo-300
                                  "
                                >
                                  <List
                                    className="
                                      h-3.5 w-3.5
                                    "
                                  />

                                  {
                                    t.serviceCatalog
                                      .technicalFields
                                  }
                                </SharedSecondaryButton>
                              </div>
                            </div>
                          ),
                        )}
                    </div>
                  )}
                </div>
              );
            },
          )}

          {groups.length === 0 && (
            <div
              className="
                active-service-empty-state
                  p-10
                text-center
                text-sm
                text-slate-500
              "
            >
              {t.common.noRecords}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
