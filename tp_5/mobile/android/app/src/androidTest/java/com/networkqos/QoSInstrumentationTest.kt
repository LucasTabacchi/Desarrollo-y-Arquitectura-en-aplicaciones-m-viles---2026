package com.networkqos

import android.content.Context
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.MediumTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@MediumTest
class QoSInstrumentationTest {

    @Test
    fun useAppContext() {
        val appContext = ApplicationProvider.getApplicationContext<Context>()
        assertEquals("com.networkqos", appContext.packageName)
    }

    @Test
    fun activityScenarioLaunchesSuccessfully() {
        val scenario = ActivityScenario.launch(MainActivity::class.java)
        assertNotNull(scenario)
        scenario.onActivity { activity ->
            assertNotNull(activity)
            assertEquals("com.networkqos", activity.packageName)
            assertNotNull(activity.window)
            assertFalse(activity.isFinishing)
        }
        scenario.close()
    }
}
