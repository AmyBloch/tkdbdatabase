/* =========================================================
   TOKYO DEBUNKER DATABASE LOADER
   Shared database loader for all pages
========================================================= */


/* =========================================================
   GOOGLE APPS SCRIPT API
========================================================= */

const SHEET_API =
    "https://script.google.com/macros/s/AKfycbymbEARugjpkD-NMolneRJ4CkZjUlV8sIfE2K1YoyFTZ11JiK-CEpunHpOMzzJRhRm1nw/exec";


/* =========================================================
   SHARED BROWSER CACHE
========================================================= */

const DATABASE_CACHE_KEY =
    "tokyoDebunkerDatabase";

const DATABASE_CACHE_TIME_KEY =
    "tokyoDebunkerDatabaseTime";


/*
 * Browser cache remains valid for 10 minutes.
 *
 * If the cache is younger than 10 minutes:
 *     use it without contacting the API.
 *
 * If the cache is older than 10 minutes:
 *     use it immediately,
 *     then request fresh data in the background.
 */

const DATABASE_CACHE_DURATION =
    10 * 60 * 1000;


/* =========================================================
   READ CACHE
========================================================= */

function getCachedDatabase() {

    try {

        const cached =
            localStorage.getItem(
                DATABASE_CACHE_KEY
            );


        if (!cached) {

            return null;

        }


        return JSON.parse(
            cached
        );

    } catch (error) {

        console.warn(
            "Could not read Tokyo Debunker database cache:",
            error
        );

        return null;

    }

}


/* =========================================================
   GET CACHE TIME
========================================================= */

function getDatabaseCacheTime() {

    try {

        return Number(
            localStorage.getItem(
                DATABASE_CACHE_TIME_KEY
            )
        ) || 0;

    } catch (error) {

        return 0;

    }

}


/* =========================================================
   CHECK CACHE FRESHNESS
========================================================= */

function isDatabaseCacheFresh() {

    const cachedTime =
        getDatabaseCacheTime();


    if (!cachedTime) {

        return false;

    }


    return (
        Date.now() - cachedTime
        <
        DATABASE_CACHE_DURATION
    );

}


/* =========================================================
   SAVE DATABASE TO CACHE
========================================================= */

function saveDatabaseCache(
    data
) {

    try {

        localStorage.setItem(
            DATABASE_CACHE_KEY,
            JSON.stringify(data)
        );


        localStorage.setItem(
            DATABASE_CACHE_TIME_KEY,
            String(Date.now())
        );


    } catch (error) {

        console.warn(
            "Could not save Tokyo Debunker database cache:",
            error
        );

    }

}


/* =========================================================
   JSONP LIVE DATABASE REQUEST
========================================================= */

function fetchLiveDatabase() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            /*
             * Use a unique callback name for this request.
             *
             * This prevents conflicts if multiple requests
             * happen close together.
             */

            const callbackName =
                "tokyoDebunkerCallback_" +
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2);


            let finished =
                false;


            const script =
                document.createElement(
                    "script"
                );


            /* -----------------------------------------
               CLEANUP
            ----------------------------------------- */

            function cleanup() {

                if (
                    script.parentNode
                ) {

                    script.parentNode.removeChild(
                        script
                    );

                }


                try {

                    delete window[
                        callbackName
                    ];

                } catch (error) {

                    window[
                        callbackName
                    ] = undefined;

                }

            }


            /* -----------------------------------------
               SUCCESS
            ----------------------------------------- */

            function finishSuccess(
                data
            ) {

                if (finished) {

                    return;

                }


                finished =
                    true;


                cleanup();


                resolve(
                    data
                );

            }


            /* -----------------------------------------
               ERROR
            ----------------------------------------- */

            function finishError(
                error
            ) {

                if (finished) {

                    return;

                }


                finished =
                    true;


                cleanup();


                reject(
                    error
                );

            }


            /*
             * Create the callback BEFORE adding
             * the Google Apps Script to the page.
             */

            window[
                callbackName
            ] =
                finishSuccess;


            /* -----------------------------------------
               SCRIPT ERROR
            ----------------------------------------- */

            script.onerror =
                () => {

                    finishError(
                        new Error(
                            "Unable to load the Google Sheets database."
                        )
                    );

                };


            /* -----------------------------------------
               CACHE-BUSTING REQUEST
            ----------------------------------------- */

            script.src =
                SHEET_API +
                "?callback=" +
                encodeURIComponent(
                    callbackName
                ) +
                "&t=" +
                Date.now();


            script.async =
                true;


            document.head.appendChild(
                script
            );


            /* -----------------------------------------
               TIMEOUT
            ----------------------------------------- */

            setTimeout(
                () => {

                    if (!finished) {

                        finishError(
                            new Error(
                                "Database request timed out."
                            )
                        );

                    }

                },
                15000
            );

        }
    );

}


/* =========================================================
   STANDARD DATABASE LOADER
========================================================= */

/*
 * Usage:
 *
 * const database =
 *     await loadDatabase();
 *
 *
 * The returned object contains the same API data
 * your current pages already use:
 *
 * database.characters
 * database.cards
 * database.cardLookup
 *
 *
 * Behavior:
 *
 * 1. If fresh cache exists:
 *      return cache immediately.
 *
 * 2. If stale cache exists:
 *      return cache immediately,
 *      then refresh API in background.
 *
 * 3. If no cache exists:
 *      wait for live API data.
 *
 * 4. If live API fails but cached data exists:
 *      return cached data.
 *
 * 5. If neither exists:
 *      throw an error.
 */

async function loadDatabase(
    options = {}
) {

    const {
        onUpdate = null,
        onError = null,
        forceRefresh = false
    } = options;


    const cachedDatabase =
        getCachedDatabase();


    const cacheIsFresh =
        isDatabaseCacheFresh();


    /* =====================================================
       FRESH CACHE
    ===================================================== */

    if (
        cachedDatabase &&
        cacheIsFresh &&
        !forceRefresh
    ) {

        return cachedDatabase;

    }


    /* =====================================================
       STALE CACHE
       Display it immediately, then refresh.
    ===================================================== */

    if (
        cachedDatabase &&
        !forceRefresh
    ) {

        /*
         * Start the refresh without making the page
         * wait for it.
         */

        fetchLiveDatabase()
            .then(
                freshDatabase => {

                    saveDatabaseCache(
                        freshDatabase
                    );


                    if (
                        typeof onUpdate ===
                        "function"
                    ) {

                        onUpdate(
                            freshDatabase
                        );

                    }

                }
            )
            .catch(
                error => {

                    console.warn(
                        "Tokyo Debunker database refresh failed. Continuing with cached data.",
                        error
                    );


                    if (
                        typeof onError ===
                        "function"
                    ) {

                        onError(
                            error
                        );

                    }

                }
            );


        return cachedDatabase;

    }


    /* =====================================================
       NO CACHE
       Must wait for live API.
    ===================================================== */

    try {

        const liveDatabase =
            await fetchLiveDatabase();


        saveDatabaseCache(
            liveDatabase
        );


        return liveDatabase;

    } catch (error) {

        /*
         * If a cache somehow exists despite the earlier
         * checks, use it as a final fallback.
         */

        if (cachedDatabase) {

            console.warn(
                "Live database request failed. Using cached data.",
                error
            );


            return cachedDatabase;

        }


        if (
            typeof onError ===
            "function"
        ) {

            onError(
                error
            );

        }


        throw error;

    }

}


/* =========================================================
   FORCE REFRESH
========================================================= */

/*
 * This is available if we ever want a page to have
 * a "Refresh Data" button.
 *
 * Most pages will NOT need to use this.
 */

async function refreshDatabase(
    options = {}
) {

    const {
        onUpdate = null,
        onError = null
    } = options;


    try {

        const freshDatabase =
            await fetchLiveDatabase();


        saveDatabaseCache(
            freshDatabase
        );


        if (
            typeof onUpdate ===
            "function"
        ) {

            onUpdate(
                freshDatabase
            );

        }


        return freshDatabase;

    } catch (error) {

        if (
            typeof onError ===
            "function"
        ) {

            onError(
                error
            );

        }


        throw error;

    }

}
